import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { retryRender } from '@/features/lofi/server/lofi-orchestrator'

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

  try {
    await retryRender(videoId, userId)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('retry-render failed', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Retry failed' }),
      { status: 500 },
    )
  }
}
