import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  brainrotTarget,
  createBrainrotExportKernel,
  phaseForRun,
} from '@/features/brainrot/server/brainrot-export'
import { getBrainrotProjectForUser } from '@/features/brainrot/server/brainrot-db'
import { isInFlight } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
const WINDOW_MS = 240 * 1000
const HEARTBEAT_MS = 15 * 1000

/**
 * Progress for the project's current export Run. Addressed by project, not by
 * job id: a tab that reloaded, or one opened from the dashboard, attaches the
 * same way. Each poll reconciles, so a missed webhook finishes the reel here
 * too — and a dropped stream is never reported as a failure.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { id: projectId } = await ctx.params
  const project = await getBrainrotProjectForUser(projectId, userId)
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
  }

  const target = brainrotTarget(userId, projectId)
  const kernel = createBrainrotExportKernel()
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
      let lastPhase: string | null = null

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
          run = await kernel.get(target)
        } catch {
          // A read that failed is not an export that failed.
          send({ status: 'progress' })
          continue
        }

        if (!run) {
          send({ status: 'idle' })
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
          send({ status: 'failed', error: run.error ?? 'Export failed', retryable: run.retryable })
          close()
          break
        }

        if (!isInFlight(run)) {
          send({ status: 'aborted' })
          close()
          break
        }

        // Compose handing over to subtitle is what the overlay is waiting to
        // hear, so say it the moment it happens rather than on the next beat.
        const phase = phaseForRun(run)
        if (phase !== lastPhase || Date.now() - lastBeat >= HEARTBEAT_MS) {
          send({ status: 'progress', phase })
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
