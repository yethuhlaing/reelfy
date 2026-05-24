'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/features/auth/server/auth-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import type { PlanConfig } from '@/features/billing/server/plans'

interface Props {
  subscriptions: PlanConfig[]
  packs: PlanConfig[]
  currentTier: string
}

export function PricingClient({ subscriptions, packs, currentTier }: Props) {
  const [pending, startTransition] = useTransition()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const checkout = (slug: string) => {
    setActiveSlug(slug)
    startTransition(async () => {
      try {
        const result = await authClient.checkout({ slug })
        const error = (result as { error?: { message?: string } | null } | null)?.error
        if (error) {
          toast.error('Checkout failed', {
            description: error.message ?? 'Could not start checkout. Please verify Polar configuration.',
          })
        }
      } catch (err) {
        console.error('Checkout failed', err)
        toast.error('Checkout failed', {
          description: err instanceof Error ? err.message : 'Unexpected error while starting checkout.',
        })
      } finally {
        setActiveSlug(null)
      }
    })
  }

  const openPortal = () => {
    startTransition(async () => {
      try {
        const result = await authClient.customer.portal()
        const error = (result as { error?: { message?: string } | null } | null)?.error
        if (error) {
          toast.error('Portal failed', {
            description: error.message ?? 'Could not open billing portal.',
          })
        }
      } catch (err) {
        console.error('Portal failed', err)
        toast.error('Portal failed', {
          description: err instanceof Error ? err.message : 'Unexpected error while opening portal.',
        })
      }
    })
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Subscriptions</h2>
          {currentTier !== 'free' && (
            <Button variant="outline" onClick={openPortal} disabled={pending}>
              Manage subscription
            </Button>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {subscriptions.map((p) => (
            <PlanCard
              key={p.slug}
              plan={p}
              current={currentTier === p.tier}
              disabled={pending || !p.productId}
              loading={pending && activeSlug === p.slug}
              onSelect={() => checkout(p.slug)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-semibold">Credit Packs</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {packs.map((p) => (
            <PlanCard
              key={p.slug}
              plan={p}
              disabled={pending || !p.productId}
              loading={pending && activeSlug === p.slug}
              onSelect={() => checkout(p.slug)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

interface PlanCardProps {
  plan: PlanConfig
  current?: boolean
  disabled?: boolean
  loading?: boolean
  onSelect: () => void
}

function PlanCard({ plan, current, disabled, loading, onSelect }: PlanCardProps) {
  const isFree = plan.priceUsd === 0
  return (
    <Card className={cn('flex flex-col', plan.highlight && 'card-gradient-border shadow-[0_24px_64px_-24px_var(--accent-glow)]')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {current && <Badge variant="secondary">Current</Badge>}
          {plan.highlight && !current && <Badge>Popular</Badge>}
        </div>
        <CardDescription>
          <span className="font-[var(--font-mono)] text-3xl font-bold tabular-nums">
            ${plan.priceUsd}
          </span>
          {plan.interval === 'month' ? '/mo' : ' once'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.highlight ? 'default' : 'outline'}
          disabled={disabled || current || isFree}
          onClick={onSelect}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isFree ? 'Free forever' : current ? 'Active' : plan.interval === 'month' ? 'Subscribe' : 'Buy pack'}
        </Button>
      </CardFooter>
    </Card>
  )
}
