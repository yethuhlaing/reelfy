import { Polar } from '@polar-sh/sdk'
import { env } from '@/shared/lib/env'

const server = (env.POLAR_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as
  | 'production'
  | 'sandbox'

let cached: Polar | null = null

export function polar(): Polar {
  if (cached) return cached
  const accessToken = env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN missing')
  }
  cached = new Polar({ accessToken, server })
  return cached
}
