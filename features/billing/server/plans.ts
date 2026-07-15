export type PlanTier = 'free' | 'starter' | 'pro'
export type PackSlug = 'credits_small' | 'credits_large'
export type ProductSlug = PlanTier | PackSlug

export interface PlanConfig {
  slug: ProductSlug
  tier: PlanTier
  name: string
  productId: string | undefined
  priceUsd: number
  interval: 'month' | 'one_time'
  monthlyCredits: number
  features: string[]
  highlight?: boolean
}

import { env } from '@/shared/lib/env'

const PLANS: Record<ProductSlug, PlanConfig> = {
  free: {
    slug: 'free',
    tier: 'free',
    name: 'Free',
    productId: undefined,
    priceUsd: 0,
    interval: 'month',
    monthlyCredits: 25,
    features: ['25 free credits to start', 'Watermarked exports', 'Community support'],
  },
  starter: {
    slug: 'starter',
    tier: 'starter',
    name: 'Starter',
    productId: env.POLAR_PRODUCT_STARTER,
    priceUsd: 9,
    interval: 'month',
    monthlyCredits: 200,
    features: ['200 credits/mo', 'No watermark', 'Standard models'],
    highlight: true,
  },
  pro: {
    slug: 'pro',
    tier: 'pro',
    name: 'Pro',
    productId: env.POLAR_PRODUCT_PRO,
    priceUsd: 29,
    interval: 'month',
    monthlyCredits: 1000,
    features: ['1000 credits/mo', 'All models', 'Priority queue'],
  },
  credits_small: {
    slug: 'credits_small',
    tier: 'free',
    name: '100 Credit Pack',
    productId: env.POLAR_PRODUCT_CREDITS_SMALL,
    priceUsd: 5,
    interval: 'one_time',
    monthlyCredits: 100,
    features: ['One-time 100 credits'],
  },
  credits_large: {
    slug: 'credits_large',
    tier: 'free',
    name: '500 Credit Pack',
    productId: env.POLAR_PRODUCT_CREDITS_LARGE,
    priceUsd: 20,
    interval: 'one_time',
    monthlyCredits: 500,
    features: ['One-time 500 credits'],
  },
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [PLANS.free, PLANS.starter, PLANS.pro]
export const CREDIT_PACKS: PlanConfig[] = [PLANS.credits_small, PLANS.credits_large]

export function planByProductId(productId: string): PlanConfig | undefined {
  return Object.values(PLANS).find((p) => p.productId === productId)
}

export function polarProductsList(): Array<{ productId: string; slug: ProductSlug }> {
  return Object.values(PLANS)
    .filter((p): p is PlanConfig & { productId: string } => Boolean(p.productId))
    .map((p) => ({ productId: p.productId, slug: p.slug }))
}
