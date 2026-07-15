import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { polarClient } from '@polar-sh/better-auth'
import { auth } from './auth'

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), polarClient()],
})

export const { signIn, signOut, useSession } = authClient
