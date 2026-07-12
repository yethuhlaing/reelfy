import { getJob, markCompleted, markFailed } from '@/shared/lib/jobs/store'
import { readFalHeaders, verifyFalWebhook } from '@/shared/lib/jobs/verify-fal'
import { completeSceneVideo } from '@/features/stories/server/story-assets'
import type { AnimatePayload, AnimateResult } from '@/shared/lib/jobs/types'
export const runtime = 'nodejs'
export const maxDuration = 60

interface FalWebhookBody {
  status?: string
  payload?: { video?: { url?: string } }
  error?: string
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params
  if (!jobId) return new Response('Missing jobId', { status: 400 })

  const headers = readFalHeaders(req)
  if (!headers) return new Response('Missing signature headers', { status: 401 })

  const raw = await req.arrayBuffer()
  const valid = await verifyFalWebhook(headers, raw).catch(() => false)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const text = new TextDecoder().decode(raw)
  let body: FalWebhookBody
  try {
    body = JSON.parse(text) as FalWebhookBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const job = await getJob<AnimatePayload>(jobId)
  if (!job) return new Response('Unknown job', { status: 404 })

  if (job.status === 'failed' || job.status === 'completed') {
    return new Response('ok')
  }

  if (body.status === 'ERROR' || body.error) {
    await markFailed(jobId, body.error ?? 'fal.ai reported error')
    return new Response('ok')
  }

  const falVideoUrl = body.payload?.video?.url
  if (!falVideoUrl) {
    await markFailed(jobId, 'Webhook payload missing video.url')
    return new Response('ok')
  }

  if (!job.payload.userId) {
    await markFailed(jobId, 'Job missing userId')
    return new Response('ok')
  }

  try {
    const res = await fetch(falVideoUrl)
    if (!res.ok) {
      throw new Error(`fal video download failed: HTTP ${res.status}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const videoUrl = await completeSceneVideo({
      storyId: job.payload.storyId,
      sceneId: job.payload.sceneId,
      userId: job.payload.userId,
      data: buf,
    })
    const result: AnimateResult = { videoUrl }
    await markCompleted(jobId, result)
  } catch (err) {
    console.error('Animate webhook failed', err)
    await markFailed(jobId, err instanceof Error ? err.message : 'Blob upload failed')
  }

  return new Response('ok')
}
