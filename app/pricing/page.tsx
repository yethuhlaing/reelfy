import { Metadata } from 'next'
import { SEO, buildCanonical } from '@/shared/lib/seo'
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '@/features/billing/server/plans'
import { getUserSession } from '@/shared/lib/db/user'
import { PricingClient } from './pricing-client'

export const metadata: Metadata = {
  title: 'Pricing — Free & Pro AI Video Generation Plans',
  description:
    'Start free or upgrade to Reelfy Pro. Generate brainrot reels, stickman explainer videos, lofi music, and memes with AI. Pay with credits — buy more anytime. Cancel anytime.',
  keywords: [
    'AI video generator pricing',
    'Reelfy plans',
    'AI content creation pricing',
    'free AI video maker',
    'AI video generator free plan',
  ],
  alternates: {
    canonical: buildCanonical('/pricing'),
  },
  openGraph: {
    title: 'Pricing | Reelfy — AI Video Generator',
    description: 'Free and Pro plans for AI video generation. Brainrot reels, stickman videos, lofi music & memes. Buy credits anytime. Cancel anytime.',
    url: `${SEO.siteUrl}/pricing`,
    images: [{ url: SEO.defaults.ogImage, width: 1200, height: 630, alt: 'Reelfy Pricing' }],
  },
}

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
