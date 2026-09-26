import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  brainrotTarget,
  createBrainrotExportKernel,
  currentBrainrotRun,
} from '@/features/brainrot/server/brainrot-export'
import { isInFlight } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Explicit cancel. Addressed by project, so the tab does not need a run id —
 * and deliberately does not reconcile first: a fal success that lands between
 * the user pressing Cancel and this read must not become a reel.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id: projectId } = await ctx.params
  const target = brainrotTarget(session.user.id, projectId)

  const current = await currentBrainrotRun(target)
  if (!current) return Response.json({ error: 'No export to cancel' }, { status: 404 })
  if (!isInFlight(current)) {
    return Response.json({ runId: current.id, status: current.status })
  }

  const run = await createBrainrotExportKernel().cancel(current.id)
  return Response.json({ runId: run.id, status: run.status })
}
