import { getJob } from '@/shared/lib/jobs/store'
import type { ExportResult } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 310

const POLL_MS = 1500
const TIMEOUT_MS = 5 * 60 * 1000

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params

  const encoder = new TextEncoder()
  let closed = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

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
          if (timeoutId) clearTimeout(timeoutId)
          controller.close()
        }
      }

      timeoutId = setTimeout(() => {
        send({ status: 'timeout', error: 'Export timed out' })
        close()
      }, TIMEOUT_MS)

      while (!closed) {
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
          if (!videoUrl) {
            send({ status: 'failed', error: 'No video URL in result' })
          } else {
            send({ status: 'done', videoUrl })
          }
          close()
          break
        }

        if (job.status === 'failed') {
          send({ status: 'failed', error: job.error ?? 'Export failed' })
          close()
          break
        }
      }
    },
    cancel() {
      closed = true
      if (timeoutId) clearTimeout(timeoutId)
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
