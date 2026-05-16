import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

export { fal }

export function abortError(): DOMException {
  return new DOMException('aborted', 'AbortError')
}

export async function withAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) throw abortError()
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', onAbort)
        reject(e)
      },
    )
  })
}