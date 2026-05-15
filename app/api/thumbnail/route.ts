import { put } from '@vercel/blob'
import { getImageProvider } from '@/lib/providers/image'
import type { ImageModel } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const THUMBNAIL_PREAMBLE =
  'YouTube-style thumbnail. Hand-drawn stickman comic art. Thick black ink outlines, flat vivid colors, no gradients, no photorealism. Bold vivid background (orange/yellow/red/cyan — NOT white). Character large and dramatic, fills 60%+ of frame. Huge expressive pose. Single dominant oversized FX (sunburst, arrow, sparkle explosion). Large bold hand-lettered title text at top, readable at small size. 16:9, bleed to edges, no borders. Scene: '

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return badRequest('Invalid JSON')
  }

  const { storyId, prompt, imageModel } = body as { storyId?: string; prompt?: string; imageModel?: ImageModel }

  if (!storyId || !prompt) {
    return badRequest('Missing required fields: storyId, prompt')
  }

  const imageProvider = getImageProvider(imageModel)
  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }

  try {
    const { mimeType, data } = await imageProvider.generate(`${THUMBNAIL_PREAMBLE}${prompt}`, { aspectRatio: '16:9' })
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN

    let url: string
    if (hasBlobToken) {
      const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
      const blob = await put(`thumbnails/${storyId}.${ext}`, data, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      url = blob.url
    } else {
      url = `data:${mimeType};base64,${data.toString('base64')}`
    }

    return Response.json({ url })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Thumbnail generation failed' }),
      { status: 500 }
    )
  }
}