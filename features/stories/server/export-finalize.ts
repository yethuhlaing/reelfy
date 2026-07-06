import { fal } from '@/shared/lib/providers/fal'
import { getJob, markCompleted, markFailed } from '@/shared/lib/jobs/store'
import { completeComposedVideo } from '@/features/stories/server/story-assets'
import type { ExportPayload, ExportResult } from '@/shared/lib/jobs/types'

/**
 * Download a composed video from fal, store it in blob, and mark the job done.
 * Shared by the fal webhook and the SSE stream's status-poll fallback so
 * completion never depends solely on inbound webhook delivery (which is
 * unreliable in local dev behind ephemeral tunnels).
 */
export async function finalizeExport(jobId: string, falVideoUrl: string): Promise<void> {
  const job = await getJob<ExportPayload>(jobId)
  if (!job) return
  if (job.status === 'completed' || job.status === 'failed') return
  if (!job.payload.userId) {
    await markFailed(jobId, 'Job missing userId')
    return
  }

  const res = await fetch(falVideoUrl)
  if (!res.ok) throw new Error(`fal video download failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const videoUrl = await completeComposedVideo({
    storyId: job.payload.storyId,
    userId: job.payload.userId,
    data: buf,
  })
  const result: ExportResult = { videoUrl }
  await markCompleted(jobId, result)
}

interface FalCompleted {
  video_url?: string
  video?: { url?: string }
}

/**
 * Ask fal directly whether the compose finished. If it did but no webhook
 * arrived, finalize here. Returns true when the job reaches a terminal state.
 */
export async function reconcileExportFromFal(jobId: string): Promise<boolean> {
  const job = await getJob<ExportPayload, ExportResult>(jobId)
  if (!job) return true
  if (job.status === 'completed' || job.status === 'failed') return true
  if (!job.providerRequestId || !job.providerEndpoint) return false

  let status: { status?: string }
  try {
    status = await fal.queue.status(job.providerEndpoint, {
      requestId: job.providerRequestId,
    })
  } catch {
    return false // transient; keep waiting
  }

  if (status.status === 'COMPLETED') {
    try {
      const out = await fal.queue.result(job.providerEndpoint, {
        requestId: job.providerRequestId,
      })
      const data = out.data as FalCompleted
      const url = data.video_url ?? data.video?.url
      if (!url) {
        await markFailed(jobId, 'fal result missing video url')
        return true
      }
      await finalizeExport(jobId, url)
      return true
    } catch (err) {
      await markFailed(jobId, err instanceof Error ? err.message : 'fal result fetch failed')
      return true
    }
  }

  // fal exposes failures via status too on some endpoints.
  if (status.status === 'ERROR' || status.status === 'FAILED') {
    await markFailed(jobId, 'fal.ai reported error')
    return true
  }

  return false
}
