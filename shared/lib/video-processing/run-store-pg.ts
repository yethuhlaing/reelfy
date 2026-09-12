/**
 * Postgres-backed `RunStore`.
 *
 * Postgres is the source of truth for a Run: status, Steps, the current Step's
 * provider pair, error and timestamps. Redis may still fan out progress, but a
 * client that loses its Redis hint recovers by reading the Target from here.
 */

import { and, desc, eq } from 'drizzle-orm'

import { db } from '@/shared/lib/db'
import { withDbRetry } from '@/shared/lib/db/retry'
import { videoRuns } from '@/shared/lib/db/schema'

import { InFlightRunExistsError } from './errors'
import type { Run, RunStatus, RunStore, Step, TargetRef } from './types'
import { targetId } from './types'

type VideoRunRow = typeof videoRuns.$inferSelect

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  return (err as { code?: string }).code === UNIQUE_VIOLATION
}

function toRun(row: VideoRunRow): Run {
  return {
    id: row.id,
    target: row.target as TargetRef,
    status: row.status as RunStatus,
    steps: (row.steps as Step[] | null) ?? [],
    error: row.error ?? undefined,
    retryable: row.retryable ?? undefined,
    creditsReserved: row.creditsReserved,
    creditsConsumed: row.creditsConsumed,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }
}

export function createPgRunStore(): RunStore {
  return {
    async create(run: Run): Promise<Run> {
      try {
        const [row] = await db
          .insert(videoRuns)
          .values({
            id: run.id,
            userId: run.target.userId,
            targetKind: run.target.kind,
            targetId: targetId(run.target),
            target: run.target,
            status: run.status,
            steps: run.steps,
            error: run.error ?? null,
            retryable: run.retryable ?? null,
            creditsReserved: run.creditsReserved,
            creditsConsumed: run.creditsConsumed,
            createdAt: new Date(run.createdAt),
            updatedAt: new Date(run.updatedAt),
          })
          .returning()
        return toRun(row)
      } catch (err) {
        // The partial unique index is what makes two concurrent `start` calls
        // resolve to one Run instead of two fal requests.
        if (isUniqueViolation(err)) throw new InFlightRunExistsError()
        throw err
      }
    },

    async findCurrentByTarget(target: TargetRef): Promise<Run | null> {
      const rows = await withDbRetry(() =>
        db
          .select()
          .from(videoRuns)
          .where(
            and(
              eq(videoRuns.targetKind, target.kind),
              eq(videoRuns.targetId, targetId(target)),
            ),
          )
          .orderBy(desc(videoRuns.createdAt))
          .limit(1),
      )
      return rows.length > 0 ? toRun(rows[0]) : null
    },

    async findById(runId: string): Promise<Run | null> {
      const rows = await withDbRetry(() =>
        db.select().from(videoRuns).where(eq(videoRuns.id, runId)).limit(1),
      )
      return rows.length > 0 ? toRun(rows[0]) : null
    },

    async save(run: Run): Promise<Run> {
      const [row] = await db
        .update(videoRuns)
        .set({
          status: run.status,
          steps: run.steps,
          error: run.error ?? null,
          retryable: run.retryable ?? null,
          creditsReserved: run.creditsReserved,
          creditsConsumed: run.creditsConsumed,
          updatedAt: new Date(run.updatedAt),
        })
        .where(eq(videoRuns.id, run.id))
        .returning()
      return toRun(row)
    },
  }
}
