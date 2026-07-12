import { fal } from '@/shared/lib/providers/fal'
import { getJob, markCompleted, markFailed, updateJobProvider } from '@/shared/lib/jobs/store'
import { uploadBrainrotOutput } from '@/features/brainrot/server/brainrot-assets'
import { updateBrainrotProject } from '@/features/brainrot/server/brainrot-db'
import { SUBTITLE_MODEL_ID } from '@/features/brainrot/constants'
import { submitBrainrotSubtitles } from '@/features/brainrot/server/export-pipeline'
import { buildWebhookUrl } from '@/shared/lib/jobs/webhook-url'
import type { BrainrotExportPayload, BrainrotExportResult } from '@/shared/lib/jobs/types'

interface FalVideoResult {
  video_url?: string
  video?: { url?: string }
}

function extractVideoUrl(data: FalVideoResult): string | null {
  return data.video_url ?? data.video?.url ?? null
}

/**
 * Mark both the job AND the project failed. Keeping them in sync prevents the
 * dashboard (which reads project.status) from showing "Rendering" forever after
 * a render dies — the failure was previously only recorded on the job.
 */
async function failBrainrotExport(
  jobId: string,
  error: string,
  project?: { projectId: string; userId: string } | null,
): Promise<void> {
  await markFailed(jobId, error)
  if (project?.userId) {
    await updateBrainrotProject(project.projectId, project.userId, { status: 'failed' }).catch(() => {})
  }
}

export async function finalizeBrainrotExport(jobId: string, falVideoUrl: string): Promise<void> {
  const job = await getJob<BrainrotExportPayload, BrainrotExportResult>(jobId)
  if (!job) return
  if (job.status === 'completed' || job.status === 'failed') return
  if (!job.payload.userId) {
    await markFailed(jobId, 'Job missing userId')
    return
  }

  const res = await fetch(falVideoUrl)
  if (!res.ok) throw new Error(`fal video download failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const videoUrl = await uploadBrainrotOutput(job.payload.projectId, buf)

  await updateBrainrotProject(job.payload.projectId, job.payload.userId, {
    outputVideoUrl: videoUrl,
    status: 'complete',
  })

  const result: BrainrotExportResult = { videoUrl }
  await markCompleted(jobId, result)
}

export async function handleBrainrotComposeWebhook(jobId: string, composedVideoUrl: string): Promise<void> {
  const job = await getJob<BrainrotExportPayload>(jobId)
  if (!job || job.status === 'completed' || job.status === 'failed') return
  // Webhook and the SSE reconcile poller can both land here; only the first
  // (phase still 'compose') submits the subtitle job.
  if (job.payload.phase !== 'compose') return

  const subtitleRequestId = await submitBrainrotSubtitles({
    videoUrl: composedVideoUrl,
    captionPosition: job.payload.captionPosition,
    webhookUrl: buildWebhookUrl('brainrot/export', jobId),
  })

  await updateJobProvider(jobId, subtitleRequestId, SUBTITLE_MODEL_ID, {
    ...job.payload,
    phase: 'subtitle',
    composedVideoUrl,
  })
}

export async function reconcileBrainrotExportFromFal(jobId: string): Promise<boolean> {
  const job = await getJob<BrainrotExportPayload, BrainrotExportResult>(jobId)
  if (!job) return true
  if (job.status === 'completed' || job.status === 'failed') return true
  if (!job.providerRequestId || !job.providerEndpoint) return false

  let status: { status?: string }
  try {
    status = await fal.queue.status(job.providerEndpoint, {
      requestId: job.providerRequestId,
    })
  } catch {
    return false
  }

  if (status.status === 'COMPLETED') {
    try {
      const out = await fal.queue.result(job.providerEndpoint, {
        requestId: job.providerRequestId,
      })
      const data = out.data as FalVideoResult
      const url = extractVideoUrl(data)
      const projectRef = { projectId: job.payload.projectId, userId: job.payload.userId }
      if (!url) {
        await failBrainrotExport(jobId, 'fal result missing video url', projectRef)
        return true
      }

      if (job.payload.phase === 'compose') {
        await handleBrainrotComposeWebhook(jobId, url)
        return false
      }

      await finalizeBrainrotExport(jobId, url)
      return true
    } catch (err) {
      await failBrainrotExport(
        jobId,
        err instanceof Error ? err.message : 'fal result fetch failed',
        { projectId: job.payload.projectId, userId: job.payload.userId },
      )
      return true
    }
  }

  if (status.status === 'ERROR' || status.status === 'FAILED') {
    await failBrainrotExport(jobId, 'fal.ai reported error', {
      projectId: job.payload.projectId,
      userId: job.payload.userId,
    })
    return true
  }

  return false
}
