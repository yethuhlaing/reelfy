import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getLofiVideoForUser } from '@/features/lofi/server/lofi-db'
import { redis } from '@/shared/lib/integrations/redis'

export const runtime = 'nodejs'
export const maxDuration = 300

const POLL_MS = 1500
const TIMEOUT_MS = 290 * 1000
const TERMINAL = new Set(['complete', 'failed', 'aborted'])

export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const video = await getLofiVideoForUser(videoId, session.user.id)
  if (!video) return new Response('Not found', { status: 404 })

  if (TERMINAL.has(video.status)) {
    const data = JSON.stringify({ status: video.status, finalVideoUrl: video.finalVideoUrl ?? undefined })
    return new Response(`data: ${data}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' },
    })
  }

  const encoder = new TextEncoder()
  let closed = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      function close() {
        if (!closed) {
          closed = true
          if (timeoutId) clearTimeout(timeoutId)
          controller.close()
        }
      }

      timeoutId = setTimeout(() => {
        send({ status: 'timeout' })
        close()
      }, TIMEOUT_MS)

      const redisKey = `lofi:video:${videoId}:status`
      let lastTs = 0

      while (!closed) {
        await new Promise<void>((r) => setTimeout(r, POLL_MS))
        if (closed) break

        try {
          const raw = await redis.get<string | Record<string, unknown>>(redisKey)
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw
            const ts = (parsed.ts as number) ?? 0
            if (ts > lastTs) {
              lastTs = ts
              send(parsed)
              if (TERMINAL.has(parsed.status as string)) {
                close()
                break
              }
            }
          }
        } catch {
          // Redis unavailable — continue polling
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
