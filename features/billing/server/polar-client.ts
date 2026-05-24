import { Polar } from '@polar-sh/sdk'

const server = (process.env.POLAR_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as
  | 'production'
  | 'sandbox'

let cached: Polar | null = null

export function polar(): Polar {
  if (cached) return cached
  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('POLAR_ACCESS_TOKEN missing')
  }
  cached = new Polar({ accessToken, server })
  return cached
}

export const polarServer = server
