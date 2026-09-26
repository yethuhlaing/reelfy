import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { createStoryExportKernel, requireStoryExportRun } from '@/features/stories/server/story-export'
import { isInFlight } from '@/shared/lib/video-processing/types'
import { RunNotFoundError } from '@/shared/lib/video-processing/errors'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
const WINDOW_MS = 240 * 1000
const HEARTBEAT_MS = 15 * 1000

export async function GET(
  request: Request,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { jobId: runId } = await ctx.params
  try {
    await requireStoryExportRun(runId, session.user.id)
  } catch (err) {
    if (err instanceof RunNotFoundError) {
      return new Response(JSON.stringify({ error: 'Run not found' }), { status: 404 })
    }
    throw err
  }

  const encoder = new TextEncoder()
  let closed = false
  const startedAt = Date.now()
  const kernel = createStoryExportKernel()

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

      while (!closed) {
        if (Date.now() - startedAt >= WINDOW_MS) {
          send({ status: 'reconnect' })
          close()
          break
        }

        await new Promise<void>((r) => setTimeout(r, POLL_MS))
        if (closed) break

        let run
        try {
          const owned = await requireStoryExportRun(runId, session.user.id)
          run = await kernel.get(owned.target)
        } catch (err) {
          if (err instanceof RunNotFoundError) {
            send({ status: 'aborted' })
            close()
            break
          }
          send({ status: 'progress' })
          continue
        }

        if (!run) {
          send({ status: 'aborted' })
          close()
          break
        }

        if (run.status === 'completed') {
          const progress = await kernel.progress(run.id)
          if (!progress?.videoUrl) send({ status: 'failed', error: 'No video URL in result' })
          else send({ status: 'done', videoUrl: progress.videoUrl })
          close()
          break
        }

        if (run.status === 'failed') {
          send({ status: 'failed', error: run.error ?? 'Export failed' })
          close()
          break
        }

        if (run.status === 'aborted') {
          send({ status: 'aborted' })
          close()
          break
        }

        if (!isInFlight(run)) {
          send({ status: 'aborted' })
          close()
          break
        }

        if (Date.now() - lastBeat >= HEARTBEAT_MS) {
          send({ status: 'progress', phase: 'composing' })
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
