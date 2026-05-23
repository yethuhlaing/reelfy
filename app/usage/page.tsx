import { Suspense } from 'react'
import { UsageStats } from '@/features/billing/UsageStats'
import { UsageDetails } from '@/features/billing/UsageDetails'
import { UsageDetailsSkeleton, UsageStatsSkeleton } from '@/features/billing/UsageSkeleton'
import { getUserSession } from '@/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function UsagePage() {
  const session = await getUserSession('/usage')
  if (!session) return null
  const userId = session.user.id
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Suspense fallback={<UsageStatsSkeleton />}>
        <UsageStats userId={userId} />
      </Suspense>
      <Suspense fallback={<UsageDetailsSkeleton />}>
        <UsageDetails userId={userId} />
      </Suspense>
    </div>
  )
}
