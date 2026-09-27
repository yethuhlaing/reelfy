import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getLofiVideoForUser } from '@/features/lofi/server/lofi-db'
import {
  createLofiKernel,
  currentLofiRun,
  lofiPhaseForRun,
  lofiTarget,
} from '@/features/lofi/server/lofi-run'
import { isInFlight } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
const WINDOW_MS = 240 * 1000
const HEARTBEAT_MS = 15 * 1000
/**
 * How often a poll asks fal rather than just reading the Run.
 *
 * A lofi Run can have twenty asset Steps out at once, and reconciling asks fal
 * about each one — so the webhook stays the fast path here and reconcile is the
 * backstop it is everywhere else, rather than a fal sweep every beat.
 */
const RECONCILE_EVERY_MS = 15 * 1000

/**
 * Progress for this video's current Run, addressed by video rather than by any
 * tab-local job id. Each poll reconciles, so a missed webhook finishes the
 * video here too, and the window ends with `reconnect` rather than a `timeout`
 * the client reads as failure: a 5-15 minute render outlives one stream.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const video = await getLofiVideoForUser(videoId, userId)
  if (!video) return new Response('Not found', { status: 404 })

  const target = lofiTarget(userId, videoId)
  const kernel = createLofiKernel()
  const encoder = new TextEncoder()
  let closed = false
  const startedAt = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      function close() {
        if (!closed) {
          closed = true
          controller.close()
        }
      }

      let lastBeat = 0
      let lastPhase: string | null = null
      let lastReconcile = 0

      while (!closed) {
        if (Date.now() - startedAt >= WINDOW_MS) {
          send({ status: 'reconnect' })
          close()
          break
        }

        await new Promise<void>((r) => setTimeout(r, POLL_MS))
        if (closed) break

        const reconcile = Date.now() - lastReconcile >= RECONCILE_EVERY_MS
        let run
        try {
          run = reconcile ? await kernel.get(target) : await currentLofiRun(target)
          if (reconcile) lastReconcile = Date.now()
        } catch {
          // A read that failed is not a generation that failed.
          continue
        }

        if (!run) {
          send({ status: 'idle' })
          close()
          break
        }

        if (!isInFlight(run)) {
          const progress = await kernel.progress(run.id)
          send({
            status: run.status === 'completed' ? 'complete' : run.status === 'failed' ? 'failed' : 'aborted',
            finalVideoUrl: progress?.videoUrl,
            error: run.error,
          })
          close()
          break
        }

        const phase = lofiPhaseForRun(run)
        const ready = run.steps.filter(
          (step) => step.kind === 'asset' && step.status === 'completed',
        ).length
        const total = run.steps.filter((step) => step.kind === 'asset').length

        // Assets handing over to the render is what the page is waiting to
        // hear, so say it the moment it happens rather than on the next beat.
        if (phase !== lastPhase || Date.now() - lastBeat >= HEARTBEAT_MS) {
          send({
            status: phase === 'rendering' ? 'rendering' : 'generating',
            phase,
            done: ready,
            total,
          })
          lastPhase = phase
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
    },
  })
}
