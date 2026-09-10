# Plan 07 — Approval Gate & Wait Tokens

**Goal:** The one human-approval gate. Run suspends on `wait.forToken()` after planning; the UI
shows the plan + cost estimate; the user approves or rejects; the run resumes. Plus TTL /
abandonment so a paused run never strands credits.

**Depends on:** 02, 06. **Blocks:** 08.

---

## Why a wait token (not an event)

`wait.forToken()` mints a **single-use token tied to this run**. The run's compute suspends (stops
billing) until the token is completed. Completing it from an authenticated API route is a clean,
run-scoped signal — no event-matching ambiguity, no risk of another run's approval leaking in.

## Suspend side (in the task — already in Plan 06)

```ts
const token = await wait.createToken({ timeout: '24h' })
await updateRun(runId, { gateToken: token.id })
metadata.set('gate', { estimate, plan: summarize(plan), providers, gateTokenId: token.id })
const gate = await wait.forToken<{ approved: boolean }>(token)
// gate.ok === false  → timed out (24h) → treat as abandoned
// gate.output.approved === false → user rejected
```

## Resume side — the approval route

`app/api/chat/[runId]/gate/route.ts`

```ts
export async function POST(req: Request, { params }) {
  const session = await requireUserSession(req)
  if (isAuthError(session)) return session
  const { runId } = await params
  const { approved } = await req.json()

  const run = await getRun(runId)
  if (!run || run.userId !== session.user.id) return notFound()       // ownership check
  if (run.status !== 'awaiting_approval' || !run.gateToken) {
    return Response.json({ error: 'not_awaiting_approval' }, { status: 409 })  // idempotent-ish
  }

  // Complete the token → wakes the suspended task
  await wait.completeToken(run.gateToken, { approved: Boolean(approved) })
  await updateRun(runId, { status: 'running', gateToken: null })
  return Response.json({ ok: true })
}
```

## Approve vs reject vs edit

- **Approve** → `{ approved: true }` → task reserves credits, proceeds to `assets`.
- **Reject** → `{ approved: false }` → task marks `cancelled`, nothing spent (reserve never ran).
- **Edit-then-approve** (optional, v2): let the user tweak the plan at the gate. Simplest MVP:
  reject → they re-prompt (new run). Richer: accept a `patchedPlan` in the POST body, validate with
  `scenePlanSchema`, store it, and pass it forward on resume. Defer unless needed.

## TTL / abandonment (credit-safety)

- `wait.createToken({ timeout: '24h' })` — if unapproved for 24h, `wait.forToken` returns
  `{ ok: false }`. The task treats that as abandoned: mark `cancelled`. **No hold was taken**
  (reserve happens *after* approval), so there's nothing to release — the design keeps abandoned
  runs cost-free by construction.
- Also add a **sweeper** (Plan 10): a scheduled job that marks any `awaiting_approval` run older
  than the TTL as `cancelled` in the DB, in case the task's own timeout path is missed. Belt +
  suspenders.
- If you ever move reservation *before* the gate, the sweeper MUST call `releaseHold`. In the
  current design it doesn't need to.

## Security

- **Ownership:** the gate route verifies `run.userId === session.user.id`. A user can only approve
  their own run.
- **State guard:** only completes the token when `status === 'awaiting_approval'`. A double-submit
  (two tabs) → the second gets `409 not_awaiting_approval`, token already consumed.
- **No token in the client:** the browser calls `POST /api/chat/[runId]/gate`; the server holds the
  actual `gateToken`. The client never sees or completes the Trigger token directly.

## Acceptance criteria

- [ ] Approving resumes the task; it reserves credits and proceeds to `assets`.
- [ ] Rejecting cancels the run with zero spend.
- [ ] A run left unapproved past TTL ends as `cancelled` with no hold outstanding.
- [ ] Approving another user's run → 404. Double-approve → 409, single execution.
