import { Suspense } from 'react'
import { DashboardContent } from '@/features/stories/components/dashboard/DashboardContent'
import { DashboardSkeleton } from '@/features/stories/components/dashboard/DashboardSkeleton'
import { getUserSession } from '@/shared/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getUserSession('/dashboard')
  if (!session) return null
  const userId = session.user.id

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={userId} />
      </Suspense>
    </div>
  )
}
