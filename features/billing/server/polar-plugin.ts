import { polar as polarPlugin, checkout, portal, usage, webhooks } from '@polar-sh/better-auth'
import { polar as polarSdk } from './polar-client'
import { polarProductsList } from './plans'
import {
  handleOrderPaid,
  handleSubscriptionActive,
  handleSubscriptionEnded,
  upsertSubscription,
} from './handlers'
import { env } from '@/shared/lib/env'

const webhookSecret = env.POLAR_WEBHOOK_SECRET
const successUrl = env.POLAR_SUCCESS_URL ?? `${env.APP_URL}/dashboard?checkout=success`

const products = polarProductsList()

export const polarPlugins = env.POLAR_ACCESS_TOKEN
  ? [
      polarPlugin({
        client: polarSdk(),
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products,
            successUrl,
            authenticatedUsersOnly: true,
          }),
          portal(),
          usage(),
          ...(webhookSecret
            ? [
                webhooks({
                  secret: webhookSecret,
                  onOrderPaid: async (payload) => {
                    await handleOrderPaid(payload.data as never)
                  },
                  onSubscriptionActive: async (payload) => {
                    await handleSubscriptionActive(payload.data as never)
                  },
                  onSubscriptionUpdated: async (payload) => {
                    await upsertSubscription(payload.data as never)
                  },
                  onSubscriptionCanceled: async (payload) => {
                    await handleSubscriptionEnded(payload.data as never)
                  },
                  onSubscriptionRevoked: async (payload) => {
                    await handleSubscriptionEnded(payload.data as never)
                  },
                }),
              ]
            : []),
        ],
      }),
    ]
  : []
