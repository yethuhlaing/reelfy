import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '@/lib/billing/plans'
import { getUserSession } from '@/lib/db/user'
import { PricingClient } from './pricing-client'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const session = await getUserSession('/pricing')
  if (!session) return null

  const currentTier = (session.user as { planTier?: string } | undefined)?.planTier ?? 'free'

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Pick a plan or top up with credit packs. Cancel anytime.
        </p>
      </header>

      <PricingClient
        subscriptions={SUBSCRIPTION_PLANS}
        packs={CREDIT_PACKS}
        currentTier={currentTier}
      />
    </div>
  )
}
