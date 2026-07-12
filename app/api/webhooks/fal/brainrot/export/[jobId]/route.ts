import { after } from 'next/server'
import { getJob, markFailed } from '@/shared/lib/jobs/store'
import { readFalHeaders, verifyFalWebhook } from '@/shared/lib/jobs/verify-fal'
import {
  finalizeBrainrotExport,
  handleBrainrotComposeWebhook,
} from '@/features/brainrot/server/export-finalize'
import { updateBrainrotProject } from '@/features/brainrot/server/brainrot-db'
import type { BrainrotExportPayload } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface FalExportBody {
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
  let body: FalExportBody
  try {
    body = JSON.parse(text) as FalExportBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const job = await getJob<BrainrotExportPayload>(jobId)
  if (!job) return new Response('Unknown job', { status: 404 })

  if (job.status === 'failed' || job.status === 'completed') {
    return new Response('ok')
  }

  if (body.status === 'ERROR' || body.error) {
    await markFailed(jobId, body.error ?? 'fal.ai reported error')
    await updateBrainrotProject(job.payload.projectId, job.payload.userId, { status: 'failed' })
    return new Response('ok')
  }

  const falVideoUrl = body.payload?.video_url ?? body.payload?.video?.url
  if (!falVideoUrl) {
    await markFailed(jobId, 'Webhook payload missing video url')
    await updateBrainrotProject(job.payload.projectId, job.payload.userId, { status: 'failed' })
    return new Response('ok')
  }

  // fal's webhook timeout is 15s. Finalizing the subtitle phase downloads the
  // full rendered mp4 and re-uploads it to R2, which blows past that budget and
  // makes fal record the delivery as "failed" (then retry 10x). Ack immediately
  // and do the heavy work after the response. The handlers are idempotent (they
  // early-return on completed/failed jobs and on phase mismatch), and the SSE
  // reconciler is a backstop if this background run dies.
  after(async () => {
    try {
      if (job.payload.phase === 'compose') {
        await handleBrainrotComposeWebhook(jobId, falVideoUrl)
      } else {
        await finalizeBrainrotExport(jobId, falVideoUrl)
      }
    } catch (err) {
      console.error('Brainrot export webhook failed', err)
      await markFailed(jobId, err instanceof Error ? err.message : 'Export finalize failed')
      await updateBrainrotProject(job.payload.projectId, job.payload.userId, { status: 'failed' })
    }
  })

  return new Response('ok')
}
