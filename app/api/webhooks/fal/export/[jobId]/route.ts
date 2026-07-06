import { getJob, markFailed } from '@/shared/lib/jobs/store'
import { readFalHeaders, verifyFalWebhook } from '@/shared/lib/jobs/verify-fal'
import { finalizeExport } from '@/features/stories/server/export-finalize'
import type { ExportPayload } from '@/shared/lib/jobs/types'

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

  const job = await getJob<ExportPayload>(jobId)
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

  try {
    await finalizeExport(jobId, falVideoUrl)
  } catch (err) {
    console.error('Export webhook failed', err)
    await markFailed(jobId, err instanceof Error ? err.message : 'Blob upload failed')
  }

  return new Response('ok')
}
