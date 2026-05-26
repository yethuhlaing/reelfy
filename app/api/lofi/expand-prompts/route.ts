import { expandPrompts } from '@/features/lofi/server/prompt-expander'
import { ALLOWED_DURATION_SEC } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_VALUES } from '@/shared/lib/text-model-options'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { TextModel } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 30

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { vibe, targetDurationSec, textModel } = body as Record<string, unknown>

  if (typeof vibe !== 'string' || vibe.trim().length === 0) return badRequest('vibe is required')
  if (typeof targetDurationSec !== 'number' || !ALLOWED_DURATION_SEC.includes(targetDurationSec)) {
    return badRequest(`targetDurationSec must be one of: ${ALLOWED_DURATION_SEC.join(', ')}`)
  }
  const model = typeof textModel === 'string' && TEXT_MODEL_VALUES.includes(textModel as TextModel)
    ? (textModel as TextModel)
    : 'gemini-2.5-flash'

  try {
    const result = await expandPrompts({ vibe: vibe.trim(), targetDurationSec, textModel: model })
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
