import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { launchVideo, InsufficientCreditsError } from '@/features/lofi/server/lofi-orchestrator'
import type { FreetouseTrackRef } from '@/features/lofi/server/lofi-orchestrator'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { VisualConfig } from '@/shared/lib/types'
import { ALLOWED_DURATION_SEC } from '@/features/lofi/lib/pricing-constants'

export const runtime = 'nodejs'
export const maxDuration = 120

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const {
    vibe,
    targetDurationSec,
    selectedTracks,
    visualConfig,
    visualPrompts,
    suggestedTitle,
    suggestedAmbientBed,
  } = body as Record<string, unknown>

  if (typeof vibe !== 'string' || vibe.trim().length === 0) return badRequest('vibe is required')
  if (typeof targetDurationSec !== 'number' || !ALLOWED_DURATION_SEC.includes(targetDurationSec)) {
    return badRequest(`targetDurationSec must be one of: ${ALLOWED_DURATION_SEC.join(', ')}`)
  }
  if (!visualConfig || typeof visualConfig !== 'object') return badRequest('visualConfig is required')
  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0) return badRequest('visualPrompts is required')
  if (!Array.isArray(selectedTracks) || selectedTracks.length === 0) return badRequest('selectedTracks is required')

  const playlistDurationSec = (selectedTracks as FreetouseTrackRef[]).reduce(
    (sum, track) => sum + (typeof track.duration_sec === 'number' ? track.duration_sec : 0),
    0,
  )
  if (playlistDurationSec > targetDurationSec) {
    return badRequest('Playlist duration exceeds target video length')
  }

  try {
    const result = await launchVideo({
      vibe: vibe.trim(),
      targetDurationSec,
      musicModel: 'freetouse',
      musicLoopCount: selectedTracks.length,
      musicPrompts: [],
      visualConfig: visualConfig as VisualConfig,
      visualPrompts: visualPrompts as string[],
      suggestedTitle: typeof suggestedTitle === 'string' ? suggestedTitle : vibe.trim(),
      suggestedAmbientBed: typeof suggestedAmbientBed === 'string' ? suggestedAmbientBed : null,
      category: 'lofi-stock',
      selectedTracks: selectedTracks as FreetouseTrackRef[],
    }, userId)

    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return new Response(
        JSON.stringify({ error: toUserErrorMessage(err.message) }),
        { status: 402 },
      )
    }
    console.error('lofi-stock generate failed', err)
    return new Response(
      JSON.stringify({
        error: toUserErrorMessage(err, 'Could not start generation. Please try again.'),
      }),
      { status: 500 },
    )
  }
}
