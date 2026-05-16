import { createJob, markRunning } from '@/lib/jobs/store'
import { buildWebhookUrl } from '@/lib/jobs/webhook-url'
import { getVideoProvider } from '@/lib/providers/video'
import type { AnimatePayload } from '@/lib/jobs/types'
import type { VideoModel } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  if (!process.env.FAL_KEY) return badRequest('FAL_KEY is not configured')
  if (!process.env.WEBHOOK_BASE_URL) return badRequest('WEBHOOK_BASE_URL is not configured')

  const payload: AnimatePayload = {
    storyId,
    sceneId,
    imageUrl,
    motionPrompt,
    videoModel,
  }

  const job = await createJob<AnimatePayload>('animate', payload)

  try {
    const provider = getVideoProvider(videoModel)
    const { requestId } = await provider.enqueue(
      imageUrl,
      motionPrompt,
      { numFrames: 121, fps: 24, width: 1280, height: 720 },
      buildWebhookUrl('animate', job.id),
    )
    await markRunning(job.id, requestId, provider.falModel)
    return Response.json({ jobId: job.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Animate enqueue failed', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
