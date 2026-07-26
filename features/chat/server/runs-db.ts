import { eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { runs } from '@/shared/lib/db/schema'
import type { Brief } from '@/features/chat/pipelines/schemas'
import type { DecisionLogEntry, RunStage, RunStatus } from '@/features/chat/types'

export type RunRow = typeof runs.$inferSelect

export async function createRun(params: {
  runId: string
  storyId: string
  userId: string
  prompt: string
  pipeline: string
  brief: Brief
}) {
  await db.insert(runs).values({
    id: params.runId,
    userId: params.userId,
    storyId: params.storyId,
    prompt: params.prompt,
    pipeline: params.pipeline,
    brief: params.brief,
    stage: 'route',
    status: 'running',
    decisionLog: [],
  })
}

export async function getRun(runId: string): Promise<RunRow | null> {
  const [row] = await db.select().from(runs).where(eq(runs.id, runId)).limit(1)
  return row ?? null
}

export async function updateRun(
  runId: string,
  patch: Partial<{
    stage: RunStage
    status: RunStatus
    gateToken: string | null
    triggerRunId: string | null
    costEstimate: number
    costActual: number
    error: string | null
    brief: Brief
    pipeline: string
  }>,
) {
  await db
    .update(runs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(runs.id, runId))
}

export async function appendDecision(runId: string, entry: Omit<DecisionLogEntry, 'at'>) {
  const at = new Date().toISOString()
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ log: runs.decisionLog }).from(runs).where(eq(runs.id, runId))
    if (!row) return

    const log = (row.log as DecisionLogEntry[]) ?? []
    const pairKey = `${entry.category}::${entry.subject}`
    const revised = log.map((e) =>
      `${e.category}::${e.subject}` === pairKey && !e.revised
        ? { ...e, revised: true }
        : e,
    )
    revised.push({ ...entry, at })
    await tx
      .update(runs)
      .set({ decisionLog: revised, updatedAt: new Date() })
      .where(eq(runs.id, runId))
  })
}

export async function findStaleGateRuns(olderThanHours: number) {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
  return db
    .select()
    .from(runs)
    .where(
      sql`${runs.status} = 'awaiting_approval' AND ${runs.updatedAt} < ${cutoff}`,
    )
}

export async function cancelRun(runId: string) {
  await updateRun(runId, { status: 'cancelled', stage: 'failed', gateToken: null })
}
