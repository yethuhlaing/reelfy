# Plan 02 — Credit Reservation Ledger

**Goal:** Implement reserve → reconcile → release with idempotency, on top of the existing
single-integer `user.credits` + `deductCredits`. This is the money-correctness core.

**Depends on:** 01 (tables). **Blocks:** 06 (task), 07 (gate).

---

## Why this is new

Current state (`shared/lib/db/credits.ts`): `user.credits` is one integer; `deductCredits` is an
atomic conditional decrement. **No hold, no reservation, no idempotency key.** A durable run that
pauses for approval and then spends across many assets needs all three:

- **Reserve** the estimate atomically at approval (so a paused run can't be undercut by other spend).
- **Reconcile** real cost per asset, idempotently (Trigger retries must never double-charge).
- **Release** failures + the unused remainder.

Pricing itself is already solved — reuse `features/billing/server/credit-catalog.ts`
(`creditsForOperation`, COGS × margin). Don't invent new credit numbers.

## The model

The user's `credits` integer stays the single balance-of-record. A **hold** is credits *moved out*
of `user.credits` into the `credit_holds` row at reserve time (so the balance already reflects the
reservation). Reconciliation is bookkeeping *within the hold* — it never touches `user.credits`
again until release returns the unused remainder.

```
reserve(estimate):   user.credits -= estimate    (atomic, guarded by balance >= estimate)
                     → credit_holds row {amount: estimate, consumed: 0}
chargeAsset(cost):   creditHolds.consumed += cost  (idempotent per (run_id, asset_id))
release():           refund = amount - consumed
                     user.credits += refund; hold.released = true
```

## File: `features/billing/server/run-credits.ts` (new)

```ts
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { user, creditHolds, creditCharges } from '@/shared/lib/db/schema'
import { creditsForOperation, type OperationKey } from './credit-catalog'
import { newId } from '@/shared/lib/id' // your id helper (cuid/nanoid)

/** Atomically move `estimate` credits from the balance into a run-scoped hold.
 *  Returns { ok:false } if the user can't afford it (caller keeps the run paused). */
export async function reserveForRun(runId: string, userId: string, estimate: number) {
  return db.transaction(async (tx) => {
    const rows = await tx.update(user)
      .set({ credits: sql`${user.credits} - ${estimate}` })
      .where(and(eq(user.id, userId), sql`${user.credits} >= ${estimate}`))
      .returning({ balance: user.credits })
    if (rows.length === 0) {
      const [u] = await tx.select({ c: user.credits }).from(user).where(eq(user.id, userId))
      return { ok: false as const, balance: u?.c ?? 0 }
    }
    // one hold per run (unique index); on retry, upsert-guard so we don't double-reserve
    await tx.insert(creditHolds)
      .values({ id: newId(), runId, userId, amount: estimate, consumed: 0 })
      .onConflictDoNothing({ target: creditHolds.runId })
    return { ok: true as const, balance: rows[0].balance }
  })
}

/** Idempotently record a real per-asset charge against the run's hold.
 *  Duplicate (runId, assetId) is a no-op — safe under Trigger step retries. */
export async function chargeAsset(args: {
  runId: string; assetId: string; operation: OperationKey; costUsd: number
}) {
  const credits = creditsForOperation(args.operation, args.costUsd)
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(creditCharges)
      .values({
        id: newId(), runId: args.runId, assetId: args.assetId,
        operation: args.operation, credits, costUsd: String(args.costUsd),
      })
      .onConflictDoNothing({ target: [creditCharges.runId, creditCharges.assetId] })
      .returning({ id: creditCharges.id })
    if (inserted.length === 0) return { charged: 0, duplicate: true } // already counted
    await tx.update(creditHolds)
      .set({ consumed: sql`${creditHolds.consumed} + ${credits}`, updatedAt: new Date() })
      .where(eq(creditHolds.runId, args.runId))
    return { charged: credits, duplicate: false }
  })
}

/** Return the unused remainder to the balance. Idempotent (released flag). */
export async function releaseHold(runId: string) {
  return db.transaction(async (tx) => {
    const [hold] = await tx.select().from(creditHolds).where(eq(creditHolds.runId, runId))
    if (!hold || hold.released) return { refunded: 0 }
    const refund = Math.max(0, hold.amount - hold.consumed)
    if (refund > 0) {
      await tx.update(user).set({ credits: sql`${user.credits} + ${refund}` })
        .where(eq(user.id, hold.userId))
    }
    await tx.update(creditHolds).set({ released: true, updatedAt: new Date() })
      .where(eq(creditHolds.runId, runId))
    return { refunded: refund }
  })
}
```

## Cost estimation (for the gate, Plan 06/07)

```ts
/** Sum the estimate from a scene_plan: per scene image + optional video/voice/music. */
export function estimateRunCredits(brief, scenePlan): number {
  // walk scenePlan.scenes → creditsForOperation('scene_image', VISUAL_PRICING cost) etc.
  // reuse VISUAL_PRICING / credit-catalog; return the total shown at the gate.
}
```

## Failure & edge rules

- **Charge on failure:** never. Only call `chargeAsset` on a *successful* asset. A failed asset
  simply isn't charged; the remainder is released at the end.
- **Run cancelled / gate abandoned:** call `releaseHold` (Plan 07 TTL job). The hold was taken at
  approval, so an abandoned *pre-approval* run never reserved anything — nothing to release.
- **Partial run (out of estimate mid-way):** shouldn't happen — the reserve covered the full
  estimate. If real cost exceeds estimate (provider price drift), the last charges can push
  `consumed > amount`; guard `release` refund at `max(0, …)` (done). Log the overage for repricing.

## Acceptance criteria

- [ ] Unit test: two concurrent `chargeAsset` with same `(runId, assetId)` → one charge, one no-op.
- [ ] Unit test: `reserveForRun` fails cleanly when balance < estimate; balance unchanged.
- [ ] Unit test: `releaseHold` refunds exactly `amount - consumed`, and is a no-op on second call.
- [ ] `user.credits` after `reserve → charge(all) → release` equals `initial - actualSpend`.
