import { put } from '@vercel/blob'
import { getVideoProvider } from '@/lib/providers/video'
import type { VideoModel } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, sceneId, imageUrl, motionPrompt, videoModel } = body as {
    storyId?: string
    sceneId?: string
    imageUrl?: string
    motionPrompt?: string
    videoModel?: VideoModel
  }

  if (!storyId || !sceneId || !imageUrl || !motionPrompt) {
    return badRequest('Missing required fields: storyId, sceneId, imageUrl, motionPrompt')
  }

  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }

  const provider = getVideoProvider(videoModel)

  try {
    const falVideoUrl = await provider.generate(imageUrl, motionPrompt, {
      numFrames: 121,
      fps: 24,
      width: 1280,
      height: 720,
    })

    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    let videoUrl: string

    if (hasBlobToken) {
      const res = await fetch(falVideoUrl)
      const buf = Buffer.from(await res.arrayBuffer())
      const blob = await put(`animations/${storyId}-${sceneId}.mp4`, buf, {
        access: 'public',
        contentType: 'video/mp4',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      videoUrl = blob.url
    } else {
      videoUrl = falVideoUrl
    }

    return Response.json({ videoUrl })
  } catch (err) {
    console.error('FAL animate error:', err)
    const msg = err instanceof Error
      ? (err.message || err.constructor.name + ': ' + JSON.stringify(err))
      : JSON.stringify(err)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
