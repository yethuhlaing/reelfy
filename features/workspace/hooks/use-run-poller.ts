'use client'

import { useEffect, useRef } from 'react'

const BASE_INTERVAL_MS = 3000
const MAX_INTERVAL_MS = 15000
const BACKOFF_AFTER_MS = 60_000

/** A Run this tab is watching, and when it first saw it (for the "stuck" timer). */
export interface PendingRun {
  runId: string
  startedAt: number
}

/** What a Run endpoint answers with. Status and result come from the Run, never from a queue record. */
interface RunPoll {
  status: string
  error?: string
  result?: { videoUrl?: string }
}

export interface RunPollerOptions {
  pending: PendingRun[]
  onCompleted: (runId: string, videoUrl: string | undefined) => void
  onFailed: (runId: string, error: string) => void
  /**
   * Where to read the Run. Required: there is no default job endpoint to fall
   * back to, because a Run is only ever addressed by its own id or its Target.
   */
  path: (runId: string) => string
}

export function useRunPoller({ pending, onCompleted, onFailed, path }: RunPollerOptions): void {
  const pendingRef = useRef(pending)
  const handlersRef = useRef({ onCompleted, onFailed, path })

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    handlersRef.current = { onCompleted, onFailed, path }
  }, [onCompleted, onFailed, path])

  useEffect(() => {
    if (pending.length === 0) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const loopStart = Date.now()

    async function tick() {
      if (cancelled) return
      const current = pendingRef.current
      if (current.length === 0) {
        scheduleNext()
        return
      }

      await Promise.all(
        current.map(async ({ runId }) => {
          try {
            const res = await fetch(handlersRef.current.path(runId), { cache: 'no-store' })
            // A Run we cannot read right now is not a failed Run. The next
            // story GET hydrates from the Target regardless of this poll.
            if (!res.ok) return
            const run = (await res.json()) as RunPoll
            if (run.status === 'completed') {
              handlersRef.current.onCompleted(runId, run.result?.videoUrl)
            } else if (run.status === 'failed' || run.status === 'aborted') {
              handlersRef.current.onFailed(
                runId,
                run.status === 'aborted' ? '' : (run.error ?? 'Run failed'),
              )
            }
          } catch {
            // network blip, retry next tick
          }
        }),
      )

      scheduleNext()
    }

    function scheduleNext() {
      if (cancelled) return
      const elapsed = Date.now() - loopStart
      const interval = elapsed < BACKOFF_AFTER_MS
        ? BASE_INTERVAL_MS
        : Math.min(MAX_INTERVAL_MS, BASE_INTERVAL_MS + Math.floor((elapsed - BACKOFF_AFTER_MS) / 30_000) * 3000)
      timeoutId = setTimeout(tick, interval)
    }

    timeoutId = setTimeout(tick, BASE_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pending.length])
}
