'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanConfig } from '@/lib/billing/plans'

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
        await authClient.checkout({ slug })
      } catch (err) {
        console.error('Checkout failed', err)
        setActiveSlug(null)
      }
    })
  }

  const openPortal = () => {
    startTransition(async () => {
      try {
        await authClient.customer.portal()
      } catch (err) {
        console.error('Portal failed', err)
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
    <Card className={cn('flex flex-col', plan.highlight && 'border-primary shadow-md')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {current && <Badge variant="secondary">Current</Badge>}
          {plan.highlight && !current && <Badge>Popular</Badge>}
        </div>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">
            ${plan.priceUsd}
          </span>
          {plan.interval === 'month' ? '/mo' : ' once'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
