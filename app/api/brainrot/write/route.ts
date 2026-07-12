import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { planBrainrotScript } from '@/features/brainrot/server/plan-script'
import { BRAINROT_WRITE_CREDITS } from '@/features/brainrot/constants'
import type { BrainrotFormat } from '@/shared/lib/types/brainrot'

export const runtime = 'nodejs'
export const maxDuration = 60

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

const FORMATS: BrainrotFormat[] = ['facts', 'narrative', 'explainer']

// AI script writer. Stateless — no project row. Takes a rough idea + format,
// charges credits, returns { title, script }. The client owns persistence (via
// the `draft` route on the next step).
export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { idea, format } = body as { idea?: string; format?: string }

  if (!idea || idea.trim().length < 3) {
    return badRequest('Idea needs at least 3 characters')
  }
  if (!format || !FORMATS.includes(format as BrainrotFormat)) {
    return badRequest('Invalid format')
  }

  const balance = await getCredits(userId)
  if (balance < BRAINROT_WRITE_CREDITS) {
    return new Response(
      JSON.stringify({
        error: 'insufficient_credits',
        balance,
        required: BRAINROT_WRITE_CREDITS,
      }),
      { status: 402 },
    )
  }

  const charge = await deductCredits(userId, BRAINROT_WRITE_CREDITS)
  if (!charge.ok) {
    return new Response(
      JSON.stringify({
        error: 'insufficient_credits',
        balance: charge.balance,
        required: BRAINROT_WRITE_CREDITS,
      }),
      { status: 402 },
    )
  }

  try {
    const plan = await planBrainrotScript(
      idea.trim(),
      format as BrainrotFormat,
      request.signal,
      { userId, operation: 'brainrot_script' },
    )
    return Response.json({
      title: plan.title,
      script: plan.script,
      balance: charge.balance,
    })
  } catch (err) {
    // Refund on failure — no output was produced.
    await deductCredits(userId, -BRAINROT_WRITE_CREDITS)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Script generation failed' }),
      { status: 500 },
    )
  }
}
