'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Loader2, Plus, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/features/auth/server/auth-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'
import { PACK_DISPLAY } from '@/features/billing/plans-display'

interface Props {
  credits: number
  className?: string
}

/**
 * In-app credit wallet: shows the live balance and lets the user top up by
 * buying a one-time credit pack straight through Polar — no trip to /pricing.
 * Mirrors the checkout flow in app/pricing/pricing-client.tsx.
 */
export function CreditWallet({ credits, className }: Props) {
  const [pending, startTransition] = useTransition()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  const buyPack = (slug: string) => {
    setActiveSlug(slug)
    startTransition(async () => {
      try {
        const result = await authClient.checkout({ slug })
        const error = (result as { error?: { message?: string } | null } | null)?.error
        if (error) {
          toast.error('Checkout failed', {
            description: error.message ?? 'Could not start checkout. Please try again.',
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

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap size={16} className="text-[var(--accent)]" />
          Credit wallet
        </CardTitle>
        <CardDescription>Credits fund every generation. Top up anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="font-[var(--font-mono)] text-4xl font-semibold tabular-nums leading-none">
            {credits.toLocaleString()}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">credits available</p>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Buy a credit pack
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PACK_DISPLAY.map((pack) => {
              const loading = pending && activeSlug === pack.slug
              return (
                <button
                  key={pack.slug}
                  type="button"
                  onClick={() => buyPack(pack.slug)}
                  disabled={pending}
                  className={cn(
                    'group relative flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition',
                    'hover:border-[var(--accent)] hover:bg-[var(--accent)]/[0.04]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    pack.bestValue
                      ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.03]'
                      : 'border-[var(--border)]',
                  )}
                >
                  {pack.bestValue && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                      Best value
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-[var(--font-mono)] text-lg font-semibold tabular-nums">
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={15} className="text-[var(--accent)]" />
                    )}
                    {pack.credits.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ${pack.priceUsd} · one-time
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3.5 text-sm">
          <span className="text-muted-foreground">Want monthly credits?</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/pricing">View plans</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
