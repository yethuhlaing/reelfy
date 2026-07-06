import { expandPrompts } from '@/features/lofi/server/prompt-expander'
import { ALLOWED_DURATION_SEC } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_VALUES, DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { TextModel } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

const VISUAL_COUNT_MIN = 1
const VISUAL_COUNT_MAX = 12

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function defaultMusicCount(targetDurationSec: number) {
  return Math.max(10, Math.ceil(targetDurationSec / 180))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { vibe, targetDurationSec, targetVisualCount, textModel } = body as Record<string, unknown>

  if (typeof vibe !== 'string' || vibe.trim().length === 0) return badRequest('vibe is required')
  if (typeof targetDurationSec !== 'number' || !ALLOWED_DURATION_SEC.includes(targetDurationSec)) {
    return badRequest(`targetDurationSec must be one of: ${ALLOWED_DURATION_SEC.join(', ')}`)
  }

  const visualCount = typeof targetVisualCount === 'number' ? targetVisualCount : 4
  if (!Number.isInteger(visualCount) || visualCount < VISUAL_COUNT_MIN || visualCount > VISUAL_COUNT_MAX) {
    return badRequest(`targetVisualCount must be an integer from ${VISUAL_COUNT_MIN} to ${VISUAL_COUNT_MAX}`)
  }

  const musicCount = visualCount === 1 ? 1 : defaultMusicCount(targetDurationSec)

  const model = typeof textModel === 'string' && TEXT_MODEL_VALUES.includes(textModel as TextModel)
    ? (textModel as TextModel)
    : DEFAULT_TEXT_MODEL

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
