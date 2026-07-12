import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { polarClient } from '@polar-sh/better-auth'
import { env } from '@/shared/lib/env'
import { auth } from './auth'

export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
  plugins: [inferAdditionalFields<typeof auth>(), polarClient()],
})

export const { signIn, signOut, useSession } = authClient
