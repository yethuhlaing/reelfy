import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  brainrotTarget,
  createBrainrotExportKernel,
  currentBrainrotRun,
} from '@/features/brainrot/server/brainrot-export'
import { RunNotRetryableError } from '@/shared/lib/video-processing/errors'
import { isInFlight } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Retry this project's failed export on the same Run. Steps that already
 * completed are not replayed, so a subtitle failure re-subtitles the composed
 * video it already has rather than starting a whole new reel.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id: projectId } = await ctx.params
  const target = brainrotTarget(session.user.id, projectId)
  const kernel = createBrainrotExportKernel()

  const current = await currentBrainrotRun(target)
  if (!current) return Response.json({ error: 'No export to retry' }, { status: 404 })
  if (isInFlight(current)) {
    return Response.json({ runId: current.id, status: current.status })
  }

  try {
    const run = await kernel.retry(current.id)
    return Response.json({ runId: run.id, status: run.status, error: run.error })
  } catch (err) {
    if (err instanceof RunNotRetryableError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    return Response.json(
      { error: err instanceof Error ? err.message : 'Retry failed' },
      { status: 500 },
    )
  }
}
