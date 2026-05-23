import Link from 'next/link'
import { Button } from '@/features/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/features/ui/card'
import { getAdminStats } from '@/lib/db/admin'
import { CostRevenueChart } from '@/features/admin/CostRevenueChart'
import { MarginByModel } from '@/features/admin/MarginByModel'
import { UserSpendTable } from '@/features/admin/UserSpendTable'

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

export async function AdminDashboardContent() {
  const data = await getAdminStats()

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

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="gap-4 py-5 xl:col-span-3">
          <CardHeader className="px-5">
            <CardTitle>Gross margin by model</CardTitle>
            <CardDescription>Estimated margin from credits charged vs API costs.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <MarginByModel rows={data.marginByModel} />
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
            <UserSpendTable rows={data.unprofitableUsers.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>

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
