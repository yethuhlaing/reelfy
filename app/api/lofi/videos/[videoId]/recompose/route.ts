import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { recomposeVideo } from '@/features/lofi/server/lofi-orchestrator'
import type { VisualConfig } from '@/shared/lib/types'
import type { FreetouseTrackRef } from '@/features/lofi/server/lofi-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body) return new Response('Invalid JSON', { status: 400 })

  const { selectedTracks, visualPrompts, visualConfig, musicModel, musicLoopCount, isStock } =
    body as {
      selectedTracks?: FreetouseTrackRef[]
      visualPrompts: string[]
      visualConfig: VisualConfig
      musicModel: string
      musicLoopCount: number
      isStock: boolean
    }

  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0) {
    return new Response('visualPrompts is required', { status: 400 })
  }
  if (!visualConfig || typeof visualConfig !== 'object') {
    return new Response('visualConfig is required', { status: 400 })
  }
  if (isStock && (!Array.isArray(selectedTracks) || selectedTracks.length === 0)) {
    return new Response('selectedTracks is required for stock videos', { status: 400 })
  }

  try {
    await recomposeVideo(videoId, userId, {
      selectedTracks,
      musicModel: musicModel ?? 'freetouse',
      musicLoopCount: selectedTracks?.length ?? musicLoopCount ?? 0,
      visualPrompts,
      visualConfig,
      isStock: !!isStock,
    })
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Recompose failed'
    const status = message.includes('terminal') ? 409 : message.includes('not found') ? 404 : 500
    return Response.json({ error: message }, { status })
  }
}
