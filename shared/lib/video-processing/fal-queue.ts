/**
 * Fal queue adapter. Maps fal's wire statuses onto the kernel port, including
 * `COMPLETED` + `error` (fal's failure shape) and 404 → `NOT_FOUND`.
 */

import { fal } from '@/shared/lib/providers/fal'

import type { FalQueue, FalQueueResult, FalQueueStatus } from './types'

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as {
    status?: number
    statusCode?: number
    body?: { status?: string }
    message?: string
  }
  if (e.status === 404 || e.statusCode === 404) return true
  if (e.body?.status === 'NOT_FOUND') return true
  return typeof e.message === 'string' && /not[_\s-]?found/i.test(e.message)
}

export function createFalQueue(): FalQueue {
  return {
    async submit(request) {
      const submitted = await fal.queue.submit(request.endpoint, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: request.input as any,
        webhookUrl: request.webhookUrl,
      })
      return { requestId: submitted.request_id }
    },

    async status(endpoint, requestId): Promise<FalQueueStatus> {
      try {
        const status = await fal.queue.status(endpoint, { requestId })
        if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
          return { status: status.status }
        }
        if (status.status === 'COMPLETED') {
          const failed = status as { error?: string; error_type?: string }
          const error = failed.error ?? failed.error_type
          return error ? { status: 'COMPLETED', error } : { status: 'COMPLETED' }
        }
        return { status: 'NOT_FOUND' }
      } catch (err) {
        if (isNotFound(err)) return { status: 'NOT_FOUND' }
        throw err
      }
    },

    async result(endpoint, requestId): Promise<FalQueueResult> {
      try {
        const out = await fal.queue.result(endpoint, { requestId })
        const data =
          out && typeof out === 'object' && 'data' in out
            ? (out.data as Record<string, unknown>)
            : (out as Record<string, unknown>)
        if (!data || typeof data !== 'object') return { found: false }
        return { found: true, data }
      } catch (err) {
        if (isNotFound(err)) return { found: false }
        throw err
      }
    },

    async cancel(endpoint, requestId) {
      await fal.queue.cancel(endpoint, { requestId })
    },
  }
}
