'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UsageTable } from '@/components/billing/UsageTable'
import { PaymentHistory } from '@/components/billing/PaymentHistory'
import { ModelBreakdown } from '@/components/billing/ModelBreakdown'
import type { UserUsageResponse } from '@/lib/types/usage'

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export default function UsagePage() {
  const [data, setData] = useState<UserUsageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/user/usage', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load usage')
        return (await res.json()) as UserUsageResponse
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <TopBar
        title="Usage & Billing"
        right={
          <Button asChild size="sm">
            <Link href="/pricing">Buy credits</Link>
          </Button>
        }
      />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Credit balance"
            value={isLoading ? '—' : String(data?.balance ?? 0)}
            hint="Current available credits"
          />
          <StatCard
            title="Credits spent"
            value={isLoading ? '—' : String(data?.totalCreditsCharged ?? 0)}
            hint="Total charged from generation activity"
          />
          <StatCard
            title="API cost"
            value={isLoading ? '—' : `$${(data?.totalCostUsd ?? 0).toFixed(4)}`}
            hint="Estimated provider spend"
          />
          <StatCard
            title="Purchases"
            value={isLoading ? '—' : `$${(data?.totalPurchasedUsd ?? 0).toFixed(2)}`}
            hint="Total payments recorded"
          />
        </div>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle>Usage history</CardTitle>
            <CardDescription>Credits, model mix, and latest activity by story.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <UsageTable rows={data?.usageByStory ?? []} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="gap-4 py-5 xl:col-span-3">
            <CardHeader className="px-5">
              <CardTitle>Model breakdown</CardTitle>
              <CardDescription>Most expensive models by accumulated API cost.</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <ModelBreakdown rows={data?.modelBreakdown ?? []} />
            </CardContent>
          </Card>

          <Card className="gap-4 py-5 xl:col-span-2">
            <CardHeader className="px-5">
              <CardTitle>Payment history</CardTitle>
              <CardDescription>Pack purchases and top-ups.</CardDescription>
              <CardAction>
                <Button asChild variant="outline" size="sm">
                  <Link href="/pricing">Top up</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-5">
              <PaymentHistory rows={data?.paymentHistory ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
