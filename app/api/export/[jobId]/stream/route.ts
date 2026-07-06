import { getJob } from '@/shared/lib/jobs/store'
import { reconcileExportFromFal } from '@/features/stories/server/export-finalize'
import type { ExportResult } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
// Close well under the 300s function wall so the client can reconnect
// and resume from Redis. Long renders survive across many reconnects.
const WINDOW_MS = 240 * 1000
const HEARTBEAT_MS = 15 * 1000

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params

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
        // End this window gracefully; client's EventSource reconnects.
        if (Date.now() - startedAt >= WINDOW_MS) {
          send({ status: 'reconnect' })
          close()
          break
        }

        await new Promise<void>((r) => setTimeout(r, POLL_MS))
        if (closed) break

        let job
        try {
          job = await getJob<unknown, ExportResult>(jobId)
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
          else send({ status: 'done', videoUrl })
          close()
          break
        }

        if (job.status === 'failed') {
          send({ status: 'failed', error: job.error ?? 'Export failed' })
          close()
          break
        }

        // Fallback: ask fal directly in case the webhook never arrived
        // (e.g. dead dev tunnel, lost callback). Throttled so we don't hammer.
        if (Date.now() - lastReconcile >= RECONCILE_MS) {
          lastReconcile = Date.now()
          reconcileExportFromFal(jobId).catch(() => {})
        }

        // Keep-alive so proxies don't drop the idle connection.
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
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
