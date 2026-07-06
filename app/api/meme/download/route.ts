import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { getTemplateById } from '@/features/meme/server/templates-db'
import { renderMeme } from '@/features/meme/server/render'
import { getGenerationForUser } from '@/features/meme/server/memes-db'
import { MEME_CLEAN_DOWNLOAD_CREDITS } from '@/features/meme/constants'

export const runtime = 'nodejs'
export const maxDuration = 60

async function fetchImage(url: string, signal?: AbortSignal): Promise<Buffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Failed to fetch template image (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { searchParams } = new URL(request.url)
  const generationId = searchParams.get('generationId')
  const templateId = searchParams.get('templateId')
  const withWatermark = searchParams.get('watermark') !== '0'

  if (!generationId || !templateId) {
    return new Response(JSON.stringify({ error: 'Missing generationId or templateId' }), { status: 400 })
  }

  const generation = await getGenerationForUser(generationId, userId)
  if (!generation) {
    return new Response(JSON.stringify({ error: 'Generation not found' }), { status: 404 })
  }

  const variant = generation.variants.find((v) => v.templateId === templateId)
  if (!variant) {
    return new Response(JSON.stringify({ error: 'Variant not found' }), { status: 404 })
  }

  const template = await getTemplateById(templateId)
  if (!template) {
    return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 })
  }

  let charged = false
  let balance = await getCredits(userId)

  if (!withWatermark) {
    if (balance < MEME_CLEAN_DOWNLOAD_CREDITS) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          balance,
          required: MEME_CLEAN_DOWNLOAD_CREDITS,
        }),
        { status: 402 },
      )
    }

    const charge = await deductCredits(userId, MEME_CLEAN_DOWNLOAD_CREDITS)
    if (!charge.ok) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          balance: charge.balance,
          required: MEME_CLEAN_DOWNLOAD_CREDITS,
        }),
        { status: 402 },
      )
    }

    charged = true
    balance = charge.balance
  }

  try {
    const templateImage = await fetchImage(template.imageUrl, request.signal)
    const png = await renderMeme({
      templateImage,
      width: template.width,
      height: template.height,
      boxes: variant.boxes,
      includeWatermark: withWatermark,
    })

    const suffix = withWatermark ? 'watermarked' : 'clean'
    const filename = `meme-${templateId}-${suffix}.png`

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        ...(charged ? { 'X-Credits-Balance': String(balance) } : {}),
      },
    })
  } catch (err) {
    if (charged) {
      await deductCredits(userId, -MEME_CLEAN_DOWNLOAD_CREDITS)
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to render meme' }),
      { status: 500 },
    )
  }
}
