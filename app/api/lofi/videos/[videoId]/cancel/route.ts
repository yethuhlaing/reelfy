import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { cancelLofiVideo } from '@/features/lofi/server/lofi-run'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Explicit cancel. Deliberately does not reconcile first: a fal success landing
 * between the user pressing Cancel and this read must not become a video.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const run = await cancelLofiVideo(session.user.id, videoId)
  if (!run) return Response.json({ error: 'No generation to cancel' }, { status: 404 })

  return Response.json({ runId: run.id, status: run.status })
}
