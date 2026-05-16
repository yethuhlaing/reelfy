import { put } from '@vercel/blob'
import { getJob, markCompleted, markFailed } from '@/lib/jobs/store'
import { readFalHeaders, verifyFalWebhook } from '@/lib/jobs/verify-fal'
import type { ComposePayload, ComposeResult } from '@/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface FalComposeBody {
  status?: string
  payload?: {
    video_url?: string
    video?: { url?: string }
  }
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
  let body: FalComposeBody
  try {
    body = JSON.parse(text) as FalComposeBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const job = await getJob<ComposePayload>(jobId)
  if (!job) return new Response('Unknown job', { status: 404 })

  if (job.status === 'failed' || job.status === 'completed') {
    return new Response('ok')
  }

  if (body.status === 'ERROR' || body.error) {
    await markFailed(jobId, body.error ?? 'fal.ai reported error')
    return new Response('ok')
  }

  const falVideoUrl = body.payload?.video_url ?? body.payload?.video?.url
  if (!falVideoUrl) {
    await markFailed(jobId, 'Webhook payload missing video url')
    return new Response('ok')
  }

  let videoUrl = falVideoUrl
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const res = await fetch(falVideoUrl)
      const buf = Buffer.from(await res.arrayBuffer())
      const blob = await put(`composed/${job.payload.storyId}.mp4`, buf, {
        access: 'public',
        contentType: 'video/mp4',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      videoUrl = `${blob.url}?v=${Date.now()}`
    } catch (err) {
      console.error('Blob copy failed, falling back to fal url', err)
    }
  }

  const result: ComposeResult = { videoUrl }
  await markCompleted(jobId, result)
  return new Response('ok')
}
