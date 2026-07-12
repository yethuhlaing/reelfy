import { getJob } from '@/shared/lib/jobs/store'
import { reconcileBrainrotExportFromFal } from '@/features/brainrot/server/export-finalize'
import type { BrainrotExportResult } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
const WINDOW_MS = 240 * 1000
const HEARTBEAT_MS = 15 * 1000

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params
  const jobId = new URL(req.url).searchParams.get('jobId')
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId query param' }), { status: 400 })
  }

  const encoder = new TextEncoder()
  let closed = false
  const startedAt = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
      }
      function close() {
        if (!closed) {
          closed = true
          controller.close()
        }
      }

      let lastBeat = Date.now()
      let lastReconcile = 0
      const RECONCILE_MS = 5000

      while (!closed) {
        if (Date.now() - startedAt >= WINDOW_MS) {
          send({ status: 'reconnect' })
          close()
          break
        }

        await new Promise<void>((r) => setTimeout(r, POLL_MS))
        if (closed) break

        let job
        try {
          job = await getJob<unknown, BrainrotExportResult>(jobId)
        } catch {
          send({ status: 'failed', error: 'Failed to read job status' })
          close()
          break
        }

        if (!job) {
          send({ status: 'failed', error: 'Job not found' })
          close()
          break
        }

        if (job.status === 'completed') {
          const videoUrl = job.result?.videoUrl
          if (!videoUrl) send({ status: 'failed', error: 'No video URL in result' })
          else send({ status: 'done', videoUrl, projectId })
          close()
          break
        }

        if (job.status === 'failed') {
          send({ status: 'failed', error: job.error ?? 'Export failed' })
          close()
          break
        }

        if (Date.now() - lastReconcile >= RECONCILE_MS) {
          lastReconcile = Date.now()
          reconcileBrainrotExportFromFal(jobId).catch(() => {})
        }

        if (Date.now() - lastBeat >= HEARTBEAT_MS) {
          send({ status: 'progress' })
          lastBeat = Date.now()
        }
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Brainrot-Project-Id': projectId,
    },
  })
}
