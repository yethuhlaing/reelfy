/**
 * Client-safe plan display data for the marketing landing page.
 *
 * The real plan config lives in `server/plans.ts` — but that imports server-only
 * `env` (Polar product IDs) and can't be pulled into a client component. This
 * mirror carries ONLY display fields (name, price, credits, features) so the
 * landing pricing section can render without leaking server config. Keep the
 * numbers in sync with `server/plans.ts`; that file remains the source of truth
 * for anything that touches checkout.
 */

export interface PlanDisplay {
  /** Matches the server plan slug — used only to link to /pricing. */
  slug: 'free' | 'starter' | 'pro'
  name: string
  tagline: string
  priceUsd: number
  /** Simple yearly estimate (10 months' price = 2 months free). */
  yearlyUsd: number
  monthlyCredits: number
  features: string[]
  highlight?: boolean
}

/** One-time credit top-up pack — display data for the in-app buy widget. */
export interface PackDisplay {
  /** Matches the server pack slug — passed to authClient.checkout(). */
  slug: 'credits_small' | 'credits_large'
  name: string
  credits: number
  priceUsd: number
  /** Marketing flag for the better-value pack. */
  bestValue?: boolean
}

export const PACK_DISPLAY: PackDisplay[] = [
  { slug: 'credits_small', name: '100 Credit Pack', credits: 100, priceUsd: 5 },
  { slug: 'credits_large', name: '500 Credit Pack', credits: 500, priceUsd: 20, bestValue: true },
]

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    slug: 'free',
    name: 'Free',
    tagline: 'Try every tool. Perfect for a first reel.',
    priceUsd: 0,
    yearlyUsd: 0,
    monthlyCredits: 25,
    features: ['25 free credits to start', 'Every generator unlocked', 'Watermarked exports', 'Community support'],
  },
  {
    slug: 'starter',
    name: 'Starter',
    tagline: 'For creators shipping content every week.',
    priceUsd: 9,
    yearlyUsd: 90,
    monthlyCredits: 200,
    features: ['200 credits / month', 'No watermark', 'Standard models', 'Email support'],
    highlight: true,
  },
  {
    slug: 'pro',
    name: 'Pro',
    tagline: 'Go all-in with every model and priority speed.',
    priceUsd: 29,
    yearlyUsd: 290,
    monthlyCredits: 1000,
    features: ['1000 credits / month', 'All models unlocked', 'Priority render queue', 'Top up anytime'],
  },
]
