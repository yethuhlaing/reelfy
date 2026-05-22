import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { getUserUsageTotals } from '@/lib/db/usage'

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className="font-[var(--font-mono)] text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export async function UsageStats({ userId }: { userId: string }) {
  const totals = await getUserUsageTotals(userId)

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Credit balance"
        value={String(totals.balance)}
        hint="Current available credits"
      />
      <StatCard
        title="Credits spent"
        value={String(totals.totalCreditsCharged)}
        hint="Total charged from generation activity"
      />
      <StatCard
        title="API cost"
        value={`$${totals.totalCostUsd.toFixed(4)}`}
        hint="Estimated provider spend"
      />
      <StatCard
        title="Purchases"
        value={`$${totals.totalPurchasedUsd.toFixed(2)}`}
        hint="Total payments recorded"
      />
    </div>
  )
}
