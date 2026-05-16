'use client'

import { useEffect, useRef } from 'react'
import type { Job, JobStatus } from './types'

const BASE_INTERVAL_MS = 3000
const MAX_INTERVAL_MS = 15000
const BACKOFF_AFTER_MS = 60_000

export interface PendingJob {
  jobId: string
  startedAt: number
}

export interface PollerOptions {
  pending: PendingJob[]
  onCompleted: (jobId: string, job: Job) => void
  onFailed: (jobId: string, error: string) => void
}

export function useJobPoller({
  pending,
  onCompleted,
  onFailed,
}: PollerOptions): void {
  const pendingRef = useRef(pending)
  const handlersRef = useRef({ onCompleted, onFailed })

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    handlersRef.current = { onCompleted, onFailed }
  }, [onCompleted, onFailed])

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
        current.map(async ({ jobId }) => {
          try {
            const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
            if (!res.ok) return
            const job = (await res.json()) as Job
            const status: JobStatus = job.status
            if (status === 'completed') handlersRef.current.onCompleted(jobId, job)
            else if (status === 'failed') handlersRef.current.onFailed(jobId, job.error ?? 'Job failed')
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
