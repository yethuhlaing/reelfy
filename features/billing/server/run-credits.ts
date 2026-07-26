import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { creditCharges, creditHolds, user } from '@/shared/lib/db/schema'
import {
  RATES,
  VISUAL_PRICING,
  creditsForOperation,
  type OperationKey,
} from '@/features/billing/server/credit-catalog'
import type { Brief, ScenePlan } from '@/features/chat/pipelines/schemas'
import type { Pipeline } from '@/features/chat/pipelines/types'

function newId() {
  return randomUUID()
}

export async function reserveForRun(runId: string, userId: string, estimate: number) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(user)
      .set({ credits: sql`${user.credits} - ${estimate}` })
      .where(and(eq(user.id, userId), sql`${user.credits} >= ${estimate}`))
      .returning({ balance: user.credits })
    if (rows.length === 0) {
      const [u] = await tx.select({ c: user.credits }).from(user).where(eq(user.id, userId))
      return { ok: false as const, balance: u?.c ?? 0 }
    }
    await tx
      .insert(creditHolds)
      .values({ id: newId(), runId, userId, amount: estimate, consumed: 0 })
      .onConflictDoNothing({ target: creditHolds.runId })
    return { ok: true as const, balance: rows[0].balance }
  })
}

export async function chargeAsset(args: {
  runId: string
  assetId: string
  operation: OperationKey
  costUsd: number
}) {
  const credits = creditsForOperation(args.operation, args.costUsd)
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(creditCharges)
      .values({
        id: newId(),
        runId: args.runId,
        assetId: args.assetId,
        operation: args.operation,
        credits,
        costUsd: String(args.costUsd),
      })
      .onConflictDoNothing({ target: [creditCharges.runId, creditCharges.assetId] })
      .returning({ id: creditCharges.id })
    if (inserted.length === 0) return { charged: 0, duplicate: true as const }
    await tx
      .update(creditHolds)
      .set({ consumed: sql`${creditHolds.consumed} + ${credits}`, updatedAt: new Date() })
      .where(eq(creditHolds.runId, args.runId))
    return { charged: credits, duplicate: false as const }
  })
}

export async function releaseHold(runId: string) {
  return db.transaction(async (tx) => {
    const [hold] = await tx.select().from(creditHolds).where(eq(creditHolds.runId, runId))
    if (!hold || hold.released) return { refunded: 0 }
    const refund = Math.max(0, hold.amount - hold.consumed)
    if (refund > 0) {
      await tx
        .update(user)
        .set({ credits: sql`${user.credits} + ${refund}` })
        .where(eq(user.id, hold.userId))
    }
    await tx
      .update(creditHolds)
      .set({ released: true, updatedAt: new Date() })
      .where(eq(creditHolds.runId, runId))
    return { refunded: refund }
  })
}

function voiceCostUsd(text: string) {
  return Math.max(0.001, text.length * RATES.elevenLabsPerChar)
}

export function estimateRunCredits(_brief: Brief, plan: ScenePlan, pipeline: Pipeline): number {
  const imagePricing = VISUAL_PRICING[pipeline.defaults.imageModel]
  const imageCredits = imagePricing?.credits ?? 1
  let total = 0
  for (const scene of plan.scenes) {
    total += imageCredits
    total += creditsForOperation('scene_voice', voiceCostUsd(scene.voiceoverText))
  }
  return total
}
