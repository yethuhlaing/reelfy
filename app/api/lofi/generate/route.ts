import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { launchVideo, InsufficientCreditsError } from '@/features/lofi/server/lofi-orchestrator'
import { ALLOWED_DURATION_SEC } from '@/features/lofi/lib/pricing-constants'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { VisualConfig } from '@/shared/lib/types'

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
    musicModel,
    musicLoopCount,
    visualConfig,
    musicPrompts,
    visualPrompts,
    suggestedTitle,
    suggestedAmbientBed,
  } = body as Record<string, unknown>

  if (typeof vibe !== 'string' || vibe.trim().length === 0) return badRequest('vibe is required')
  if (typeof targetDurationSec !== 'number' || !ALLOWED_DURATION_SEC.includes(targetDurationSec)) {
    return badRequest(`targetDurationSec must be one of: ${ALLOWED_DURATION_SEC.join(', ')}`)
  }
  if (typeof musicModel !== 'string') return badRequest('musicModel is required')
  if (typeof musicLoopCount !== 'number' || !Number.isInteger(musicLoopCount) || musicLoopCount < 1) return badRequest('musicLoopCount must be >= 1')
  if (!visualConfig || typeof visualConfig !== 'object') return badRequest('visualConfig is required')
  if (!Array.isArray(musicPrompts) || musicPrompts.length === 0) return badRequest('musicPrompts is required')
  if (!Array.isArray(visualPrompts) || visualPrompts.length === 0) return badRequest('visualPrompts is required')

  try {
    const result = await launchVideo({
      vibe: vibe.trim(),
      targetDurationSec,
      musicModel,
      musicLoopCount,
      visualConfig: visualConfig as VisualConfig,
      musicPrompts: musicPrompts as string[],
      visualPrompts: visualPrompts as string[],
      suggestedTitle: typeof suggestedTitle === 'string' ? suggestedTitle : vibe.trim(),
      suggestedAmbientBed: typeof suggestedAmbientBed === 'string' ? suggestedAmbientBed : null,
    }, userId)

    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return new Response(
        JSON.stringify({ error: toUserErrorMessage(err.message) }),
        { status: 402 },
      )
    }
    console.error('generate failed', err)
    return new Response(
      JSON.stringify({
        error: toUserErrorMessage(err, 'Could not start generation. Please try again.'),
      }),
      { status: 500 },
    )
  }
}
