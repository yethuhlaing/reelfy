const CONNECTION_ERROR_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', '57P01', '08006', '08003'])

function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as { code?: string; cause?: unknown; message?: string }
  if (err.code && CONNECTION_ERROR_CODES.has(err.code)) return true

  const message = err.message ?? ''
  if (message.includes('ECONNRESET') || message.includes('Connection terminated')) return true

  return isConnectionError(err.cause)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withDbRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt >= retries || !isConnectionError(error)) throw error
      await sleep(250 * (attempt + 1))
    }
  }

  throw lastError
}
