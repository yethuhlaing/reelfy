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
import { UsageTable } from '@/features/billing/UsageTable'
import { ModelBreakdown } from '@/features/billing/ModelBreakdown'
import { PaymentHistory } from '@/features/billing/PaymentHistory'
import { getUserUsageData } from '@/lib/db/usage'

export async function UsageDetails({ userId }: { userId: string }) {
  const data = await getUserUsageData(userId)

  return (
    <>
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Usage history</CardTitle>
          <CardDescription>Credits, model mix, and latest activity by story.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <UsageTable rows={data.usageByStory} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="gap-4 py-5 xl:col-span-3">
          <CardHeader className="px-5">
            <CardTitle>Model breakdown</CardTitle>
            <CardDescription>Most expensive models by accumulated API cost.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <ModelBreakdown rows={data.modelBreakdown} />
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
            <PaymentHistory rows={data.paymentHistory} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
