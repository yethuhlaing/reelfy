import { getImageProvider } from '@/lib/providers/image'
import { buildThumbnailPrompt } from '@/lib/prompts/thumbnail'
import type { ImageModel } from '@/lib/types'
import { requireUserSession, isAuthError } from '@/lib/db/user'
import { getStoryForUser } from '@/lib/db/stories'
import { completeThumbnail } from '@/lib/story-assets'

export const runtime = 'nodejs'
export const maxDuration = 60

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

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

  const story = await getStoryForUser(storyId, userId)
  if (!story) {
    return new Response(JSON.stringify({ error: 'Story not found' }), { status: 404 })
  }

  const imageProvider = getImageProvider(imageModel)
  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return badRequest('BLOB_READ_WRITE_TOKEN is not configured')
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

    const url = await completeThumbnail({
      storyId,
      userId,
      data,
      mimeType,
    })

    return Response.json({ url })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Thumbnail generation failed' }),
      { status: 500 },
    )
  }
}
