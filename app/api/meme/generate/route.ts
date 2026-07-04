import { randomUUID } from 'node:crypto'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { generateMemeVariants } from '@/features/meme/server/pipeline'
import { insertGeneration } from '@/features/meme/server/memes-db'
import { watermarkForPlan } from '@/features/meme/server/watermark'
import type { MemeGenResult } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const CREDITS_PER_GENERATION = 1

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id
  const planTier = (session.user as { planTier?: string }).planTier ?? 'free'

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { idea } = body as { idea?: string }
  if (!idea || idea.trim().length < 2) {
    return badRequest('Missing required field: idea')
  }

  const balance = await getCredits(userId)
  if (balance < CREDITS_PER_GENERATION) {
    return new Response(
      JSON.stringify({ error: 'insufficient_credits', balance, required: CREDITS_PER_GENERATION }),
      { status: 402 },
    )
  }

  const charge = await deductCredits(userId, CREDITS_PER_GENERATION)
  if (!charge.ok) {
    return new Response(
      JSON.stringify({ error: 'insufficient_credits', balance: charge.balance, required: CREDITS_PER_GENERATION }),
      { status: 402 },
    )
  }

  try {
    const trimmed = idea.trim()
    const variants = await generateMemeVariants({
      idea: trimmed,
      userId,
      variantCount: 3,
      watermark: watermarkForPlan(planTier),
      signal: request.signal,
    })

    const generationId = randomUUID()
    await insertGeneration({
      id: generationId,
      userId,
      inputText: trimmed,
      variants,
      creditsCharged: CREDITS_PER_GENERATION,
    })

    const result: MemeGenResult = {
      generationId,
      variants,
      creditsCharged: CREDITS_PER_GENERATION,
      balance: charge.balance,
    }
    return Response.json(result)
  } catch (err) {
    await deductCredits(userId, -CREDITS_PER_GENERATION)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Meme generation failed' }),
      { status: 500 },
    )
  }
}
