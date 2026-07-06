import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getTemplateById } from '@/features/meme/server/templates-db'
import { renderMeme } from '@/features/meme/server/render'
import { getGenerationForUser, updateGenerationVariant, uploadMemeImage } from '@/features/meme/server/memes-db'
import { shouldWatermarkForPlan } from '@/features/meme/server/watermark'
import type { MemeRenderBox, MemeVariant } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

async function fetchImage(url: string, signal?: AbortSignal): Promise<Buffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Failed to fetch template image (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/** Update one variant inside a saved generation (re-renders PNG). */
export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id
  const planTier = (session.user as { planTier?: string }).planTier ?? 'free'

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { generationId, templateId, boxes } = body as {
    generationId?: string
    templateId?: string
    boxes?: MemeRenderBox[]
  }
  if (!generationId || !templateId || !Array.isArray(boxes) || boxes.length === 0) {
    return badRequest('Missing required fields: generationId, templateId, boxes')
  }

  const generation = await getGenerationForUser(generationId, userId)
  if (!generation) {
    return new Response(JSON.stringify({ error: 'Generation not found' }), { status: 404 })
  }

  const existingVariant = generation.variants.find((v) => v.templateId === templateId)
  if (!existingVariant) {
    return new Response(JSON.stringify({ error: 'Variant not found' }), { status: 404 })
  }

  const template = await getTemplateById(templateId)
  if (!template) {
    return new Response(JSON.stringify({ error: 'Template not found' }), { status: 404 })
  }

  try {
    const templateImage = await fetchImage(template.imageUrl, request.signal)
    const png = await renderMeme({
      templateImage,
      width: template.width,
      height: template.height,
      boxes,
      includeWatermark: shouldWatermarkForPlan(planTier),
    })

    const renderedUrl = await uploadMemeImage(`${generationId}-${templateId}`, png)
    const updatedVariant: MemeVariant = {
      ...existingVariant,
      boxes,
      renderedUrl,
    }

    const updated = await updateGenerationVariant({
      generationId,
      userId,
      templateId,
      variant: updatedVariant,
    })
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Failed to update generation' }), { status: 500 })
    }

    return Response.json({ variant: updatedVariant, generation: updated })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to save meme' }),
      { status: 500 },
    )
  }
}
