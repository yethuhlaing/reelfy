import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { waitUntil } from '@vercel/functions'
import { db } from '@/lib/db'
import { account, rateLimit, session, user, verification } from '@/lib/db/schema'

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

// if (!googleClientId || !googleClientSecret) {
//   throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required')
// }

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
      rateLimit,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? ''],
  socialProviders: {
    google: {
      clientId: googleClientId!,
      clientSecret: googleClientSecret,
    },
  },
  account: {
    encryptOAuthTokens: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/api/auth/sign-in/social': { window: 60, max: 10 },
    },
  },
  advanced: {
    useSecureCookies: true,
    backgroundTasks: {
      handler: (promise) => waitUntil(promise),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false,
      },
      credits: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false,
      },
      freeCreditsActivated: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
})
