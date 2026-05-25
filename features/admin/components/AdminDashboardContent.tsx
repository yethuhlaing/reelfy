import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { getAdminStats } from '@/features/admin/server/admin'
import { CostRevenueChart } from '@/features/admin/components/CostRevenueChart'
import { MarginByModel } from '@/features/admin/components/MarginByModel'
import { UserSpendTable } from '@/features/admin/components/UserSpendTable'

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

function AdminStatsError({ message }: { message: string }) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle>Could not load admin stats</CardTitle>
        <CardDescription>
          The database request failed. This is usually a temporary connection issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5">
        <p className="font-mono text-xs text-muted-foreground">{message}</p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/admin">Retry</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export async function AdminDashboardContent() {
  let data: Awaited<ReturnType<typeof getAdminStats>>
  try {
    data = await getAdminStats()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return <AdminStatsError message={message} />
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Revenue"
          value={`$${data.totals.revenueUsd.toFixed(2)}`}
          hint="Total paid credits"
        />
        <StatCard
          title="API costs"
          value={`$${data.totals.costUsd.toFixed(4)}`}
          hint="Accumulated provider spend"
        />
        <StatCard
          title="Gross margin"
          value={`$${data.totals.marginUsd.toFixed(4)}`}
          hint="Revenue minus API costs"
        />
        <StatCard
          title="Margin %"
          value={`${data.totals.marginPct.toFixed(2)}%`}
          hint="Gross margin ratio"
        />
        <StatCard
          title="Active users"
          value={String(data.totals.activeUsers)}
          hint="Users with billing or cost activity"
        />
      </div>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Revenue vs API costs</CardTitle>
          <CardDescription>Daily trend for monetization and spend.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <CostRevenueChart data={data.revenueVsCostDaily} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Gross margin by model</CardTitle>
          <CardDescription>Estimated margin from credits charged vs API costs.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <MarginByModel rows={data.marginByModel} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Unprofitable users</CardTitle>
          <CardDescription>Users where API costs exceed payments.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <UserSpendTable rows={data.unprofitableUsers} />
        </CardContent>
      </Card>

      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Top 10 most expensive users</CardTitle>
          <CardDescription>Users with highest cumulative API costs.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <UserSpendTable rows={data.topExpensiveUsers} />
        </CardContent>
      </Card>
    </>
  )
}
