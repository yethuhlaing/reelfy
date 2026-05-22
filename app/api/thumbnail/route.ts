import { put } from '@vercel/blob'
import { getImageProvider } from '@/lib/providers/image'
import { buildThumbnailPrompt } from '@/lib/prompts/thumbnail'
import type { ImageModel } from '@/lib/types'
import { auth } from '@/lib/externals/betterauth'

export const runtime = 'nodejs'
export const maxDuration = 60

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id

  const body = await request.json().catch(() => null)
  if (!body) {
    return badRequest('Invalid JSON')
  }

  const { storyId, prompt, title, tagline, imageModel } = body as {
    storyId?: string
    prompt?: string
    title?: string | null
    tagline?: string | null
    imageModel?: ImageModel
  }

  if (!storyId || !prompt) {
    return badRequest('Missing required fields: storyId, prompt')
  }

  const imageProvider = getImageProvider(imageModel)
  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }

  try {
    const fullPrompt = buildThumbnailPrompt({ scenePrompt: prompt, title, tagline })
    const { mimeType, data } = await imageProvider.generate(fullPrompt, {
      aspectRatio: '16:9',
      costContext: {
        userId,
        storyId,
        operation: 'thumbnail_image',
      },
    })
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
      url = `${blob.url}?v=${Date.now()}`
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