import { cancelRun, findStaleGateRuns } from '@/features/chat/server/runs-db'

/** Backstop: mark stale gate waits as cancelled (no hold to release pre-approval). */
export async function sweepStaleGateRuns(olderThanHours = 24) {
  const stale = await findStaleGateRuns(olderThanHours)
  for (const run of stale) {
    await cancelRun(run.id)
  }
  return stale.length
}
