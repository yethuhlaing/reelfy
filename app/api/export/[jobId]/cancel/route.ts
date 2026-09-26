import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { createStoryExportKernel, requireStoryExportRun } from '@/features/stories/server/story-export'
import { RunNotFoundError } from '@/shared/lib/video-processing/errors'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { jobId: runId } = await ctx.params

  try {
    await requireStoryExportRun(runId, session.user.id)
    const kernel = createStoryExportKernel()
    const run = await kernel.cancel(runId)
    return Response.json({ runId: run.id, status: run.status })
  } catch (err) {
    if (err instanceof RunNotFoundError) {
      return Response.json({ error: 'Run not found' }, { status: 404 })
    }
    throw err
  }
}
