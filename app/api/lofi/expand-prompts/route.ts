import { expandPrompts } from '@/features/lofi/server/prompt-expander'
import { ALLOWED_DURATION_SEC } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_VALUES } from '@/shared/lib/text-model-options'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { TextModel } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

const MUSIC_COUNT_MIN = 10
const MUSIC_COUNT_MAX = 30
const VISUAL_COUNT_MIN = 1
const VISUAL_COUNT_MAX = 12

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function defaultMusicCount(targetDurationSec: number) {
  return Math.max(MUSIC_COUNT_MIN, Math.ceil(targetDurationSec / 180))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { vibe, targetDurationSec, targetMusicCount, targetVisualCount, textModel } = body as Record<
    string,
    unknown
  >

  if (typeof vibe !== 'string' || vibe.trim().length === 0) return badRequest('vibe is required')
  if (typeof targetDurationSec !== 'number' || !ALLOWED_DURATION_SEC.includes(targetDurationSec)) {
    return badRequest(`targetDurationSec must be one of: ${ALLOWED_DURATION_SEC.join(', ')}`)
  }

  const musicCount =
    typeof targetMusicCount === 'number' ? targetMusicCount : defaultMusicCount(targetDurationSec)
  if (!Number.isInteger(musicCount) || musicCount < MUSIC_COUNT_MIN || musicCount > MUSIC_COUNT_MAX) {
    return badRequest(`targetMusicCount must be an integer from ${MUSIC_COUNT_MIN} to ${MUSIC_COUNT_MAX}`)
  }

  const visualCount = typeof targetVisualCount === 'number' ? targetVisualCount : 4
  if (!Number.isInteger(visualCount) || visualCount < VISUAL_COUNT_MIN || visualCount > VISUAL_COUNT_MAX) {
    return badRequest(`targetVisualCount must be an integer from ${VISUAL_COUNT_MIN} to ${VISUAL_COUNT_MAX}`)
  }

  const model = typeof textModel === 'string' && TEXT_MODEL_VALUES.includes(textModel as TextModel)
    ? (textModel as TextModel)
    : 'gemini-2.5-flash'

  try {
    const result = await expandPrompts({
      vibe: vibe.trim(),
      targetDurationSec,
      targetMusicCount: musicCount,
      targetVisualCount: visualCount,
      textModel: model,
    })
    return Response.json(result)
  } catch (err) {
    console.error('expand-prompts failed', err)
    return new Response(
      JSON.stringify({
        error: toUserErrorMessage(err, 'Could not generate prompts. Please try again.'),
      }),
      { status: 500 },
    )
  }
}
