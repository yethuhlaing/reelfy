import { fireAndForgetUsage } from '@/features/billing/server/usage'
import type { MemeRenderBox, MemeTemplate, MemeVariant } from '@/shared/lib/types'
import { embedText } from './embeddings'
import { retrieveTemplates } from './templates-db'
import { generateCaptions } from './caption'
import { renderMeme } from './render'
import { uploadMemeImage } from './memes-db'

/** Merge a template's box geometry/style with LLM caption text. */
function toRenderBoxes(template: MemeTemplate, captions: { index: number; text: string }[]): MemeRenderBox[] {
  return template.textBoxes.map((box) => ({
    ...box,
    text: captions.find((c) => c.index === box.index)?.text ?? '',
  }))
}

async function fetchTemplateImage(url: string, signal?: AbortSignal): Promise<Buffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Failed to fetch template image (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Generate N meme variants for a user idea.
 *
 * Steps: embed idea -> pgvector top-N templates -> caption each (parallel) ->
 * render each (parallel) -> upload preview PNGs. Fully synchronous.
 *
 * `watermark` is applied to the rendered preview when the user is on a plan
 * that carries one (free tier).
 */
export async function generateMemeVariants(params: {
  idea: string
  userId: string
  variantCount?: number
  watermark?: string
  signal?: AbortSignal
}): Promise<MemeVariant[]> {
  const { idea, userId, variantCount = 3, watermark, signal } = params

  const queryEmbedding = await embedText(idea, signal)
  const templates = await retrieveTemplates(queryEmbedding, variantCount)
  if (templates.length === 0) {
    throw new Error('No meme templates available')
  }

  const variants = await Promise.all(
    templates.map(async (template): Promise<MemeVariant> => {
      const [captions, templateImage] = await Promise.all([
        generateCaptions(idea, template, signal),
        fetchTemplateImage(template.imageUrl, signal),
      ])
      const boxes = toRenderBoxes(template, captions)
      const png = await renderMeme({
        templateImage,
        width: template.width,
        height: template.height,
        boxes,
        watermark,
      })
      const renderedUrl = await uploadMemeImage(`variant-${template.id}-${Date.now()}`, png)

      return {
        templateId: template.id,
        templateName: template.name,
        imageUrl: template.imageUrl,
        width: template.width,
        height: template.height,
        boxes,
        renderedUrl,
      }
    }),
  )

  fireAndForgetUsage({
    userId,
    meter: 'meme_generation',
    quantity: 1,
    route: '/api/meme/generate',
    metadata: { variantCount: variants.length },
  })

  return variants
}
