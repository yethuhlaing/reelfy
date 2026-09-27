import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { retryLofiVideo } from '@/features/lofi/server/lofi-run'
import {
  InsufficientCreditsError,
  RunNotFoundError,
  RunNotRetryableError,
} from '@/shared/lib/video-processing/errors'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Retry this video's failed Run. Assets that are ready stay ready, so the
 * render re-runs on music that was already paid for — and only the loops that
 * never produced anything are charged again.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  try {
    const run = await retryLofiVideo(session.user.id, videoId)
    return Response.json({ runId: run.id, status: run.status, error: run.error })
  } catch (err) {
    if (err instanceof RunNotFoundError) {
      return Response.json({ error: 'No generation to retry' }, { status: 404 })
    }
    if (err instanceof InsufficientCreditsError) {
      return Response.json(
        { error: err.message, balance: err.balance, required: err.required },
        { status: 402 },
      )
    }
    if (err instanceof RunNotRetryableError) {
      return Response.json({ error: err.message }, { status: 409 })
    }
    return Response.json(
      { error: err instanceof Error ? err.message : 'Retry failed' },
      { status: 409 },
    )
  }
}
