import { and, eq, sql } from 'drizzle-orm'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { waitUntil } from '@vercel/functions'
import { db } from '@/shared/lib/db'
import { getFreeCreditsOnSignup } from '@/shared/lib/db/config'
import { account, rateLimit, session, user, verification } from '@/shared/lib/db/schema'
import { polarPlugins } from '@/features/billing/server/polar-plugin'
import { env } from '@/shared/lib/env'

const googleClientId = env.GOOGLE_CLIENT_ID
const googleClientSecret = env.GOOGLE_CLIENT_SECRET

/**
 * Given the canonical app URL, return the set of trusted origins including both
 * the apex and the `www` subdomain so auth requests from either are accepted.
 */
function buildTrustedOrigins(appUrl: string): string[] {
  const origins = new Set<string>()
  try {
    const url = new URL(appUrl)
    origins.add(url.origin)
    const host = url.hostname
    if (host.startsWith('www.')) {
      origins.add(`${url.protocol}//${host.slice(4)}`)
    } else {
      origins.add(`${url.protocol}//www.${host}`)
    }
  } catch {
    origins.add(appUrl)
  }
  return [...origins]
}

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
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  // Accept both the canonical apex origin and its www subdomain. Requests may
  // arrive at www.reelfyme.com before the host-level redirect to the apex.
  trustedOrigins: buildTrustedOrigins(env.APP_URL),
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
      polarCustomerId: {
        type: 'string',
        required: false,
        input: false,
      },
      planTier: {
        type: 'string',
        required: false,
        defaultValue: 'free',
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const userId = createdUser?.id
          if (!userId) return

          const creditsToGrant = await getFreeCreditsOnSignup()
          if (creditsToGrant <= 0) return

          await db
            .update(user)
            .set({
              credits: sql`${user.credits} + ${creditsToGrant}`,
              freeCreditsActivated: true,
            })
            .where(and(eq(user.id, userId), eq(user.freeCreditsActivated, false)))
        },
      },
    },
  },
  plugins: [...polarPlugins, nextCookies()],
})
