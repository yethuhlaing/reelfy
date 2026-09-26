import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { createAnimateKernel } from '@/features/stories/server/animate-kernel'
import { createPgRunStore } from '@/shared/lib/video-processing/run-store-pg'
import { isInFlight } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id } = await ctx.params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const store = createPgRunStore()
  const existing = await store.findById(id)
  if (!existing || existing.target.userId !== session.user.id || existing.target.kind !== 'scene') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const kernel = createAnimateKernel()
  const run = isInFlight(existing) ? (await kernel.get(existing.target)) ?? existing : existing
  const progress = await kernel.progress(run.id)
  if (!progress) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    id: progress.runId,
    status: progress.status,
    error: progress.error,
    result: progress.videoUrl ? { videoUrl: progress.videoUrl } : undefined,
    createdAt: run.createdAt,
  })
}
