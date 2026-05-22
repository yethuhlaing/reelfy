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
import { CostRevenueChart } from '@/components/admin/CostRevenueChart'
import { MarginByModel } from '@/components/admin/MarginByModel'
import { UserSpendTable } from '@/components/admin/UserSpendTable'
import type { AdminStatsResponse } from '@/lib/types/admin'

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

export default function AdminPage() {
  const [data, setData] = useState<AdminStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load admin stats')
        return (await res.json()) as AdminStatsResponse
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
        title="Admin Dashboard"
        right={
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">View all users</Link>
          </Button>
        }
      />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Revenue"
            value={isLoading ? '—' : `$${(data?.totals.revenueUsd ?? 0).toFixed(2)}`}
            hint="Total paid credits"
          />
          <StatCard
            title="API costs"
            value={isLoading ? '—' : `$${(data?.totals.costUsd ?? 0).toFixed(4)}`}
            hint="Accumulated provider spend"
          />
          <StatCard
            title="Gross margin"
            value={isLoading ? '—' : `$${(data?.totals.marginUsd ?? 0).toFixed(4)}`}
            hint="Revenue minus API costs"
          />
          <StatCard
            title="Margin %"
            value={isLoading ? '—' : `${(data?.totals.marginPct ?? 0).toFixed(2)}%`}
            hint="Gross margin ratio"
          />
          <StatCard
            title="Active users"
            value={isLoading ? '—' : String(data?.totals.activeUsers ?? 0)}
            hint="Users with billing or cost activity"
          />
        </div>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle>Revenue vs API costs</CardTitle>
            <CardDescription>Daily trend for monetization and spend.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <CostRevenueChart data={data?.revenueVsCostDaily ?? []} />
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="gap-4 py-5 xl:col-span-3">
            <CardHeader className="px-5">
              <CardTitle>Gross margin by model</CardTitle>
              <CardDescription>Estimated margin from credits charged vs API costs.</CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <MarginByModel rows={data?.marginByModel ?? []} />
            </CardContent>
          </Card>

          <Card className="gap-4 py-5 xl:col-span-2">
            <CardHeader className="px-5">
              <CardTitle>Unprofitable users</CardTitle>
              <CardDescription>Users where API costs exceed payments.</CardDescription>
              <CardAction>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/users?state=unprofitable">Open list</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-5">
              <UserSpendTable rows={(data?.unprofitableUsers ?? []).slice(0, 5)} />
            </CardContent>
          </Card>
        </div>

        <Card className="gap-4 py-5">
          <CardHeader className="px-5">
            <CardTitle>Top 10 most expensive users</CardTitle>
            <CardDescription>Users with highest cumulative API costs.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <UserSpendTable rows={data?.topExpensiveUsers ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
