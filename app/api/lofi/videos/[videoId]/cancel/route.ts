import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { cancelVideo } from '@/features/lofi/server/lofi-orchestrator'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  await cancelVideo(videoId, userId)

  return Response.json({ ok: true })
}
