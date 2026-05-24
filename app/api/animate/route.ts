import { createJob, markRunning } from '@/shared/lib/jobs/store'
import { buildWebhookUrl } from '@/shared/lib/jobs/webhook-url'
import { getVideoProvider } from '@/shared/lib/providers/video'
import type { AnimatePayload } from '@/shared/lib/jobs/types'
import type { VideoModel, VideoQuality } from '@/shared/lib/types'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser } from '@/features/stories/server/stories-db'
import { clearSceneVideo } from '@/features/stories/server/story-assets'

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
  if (!body) return badRequest('Invalid JSON')

  const { storyId, sceneId, imageUrl, motionPrompt, videoModel, videoQuality } = body as {
    storyId?: string
    sceneId?: string
    imageUrl?: string
    motionPrompt?: string
    videoModel?: VideoModel
    videoQuality?: VideoQuality
  }

  const dims = videoQuality === '1080p'
    ? { width: 1920, height: 1080 }
    : { width: 1280, height: 720 }

  if (!storyId || !sceneId || !imageUrl || !motionPrompt) {
    return badRequest('Missing required fields: storyId, sceneId, imageUrl, motionPrompt')
  }

  const story = await getStoryForUser(storyId, userId)
  if (!story) return badRequest('Story not found')

  if (!process.env.FAL_KEY) return badRequest('FAL_KEY is not configured')
  if (!process.env.WEBHOOK_BASE_URL) return badRequest('WEBHOOK_BASE_URL is not configured')

  await clearSceneVideo(storyId, sceneId, userId)

  const payload: AnimatePayload = {
    storyId,
    sceneId,
    imageUrl,
    motionPrompt,
    videoModel,
    userId,
  }

  const job = await createJob<AnimatePayload>('animate', payload)

  try {
    const provider = getVideoProvider(videoModel)
    const { requestId } = await provider.enqueue(
      imageUrl,
      motionPrompt,
      {
        numFrames: 121,
        fps: 24,
        ...dims,
        costContext: {
          userId,
          storyId,
          sceneId,
          operation: 'scene_video',
        },
      },
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
