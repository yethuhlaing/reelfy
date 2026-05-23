import { Suspense } from 'react'
import { DashboardContent } from '@/features/dashboard/DashboardContent'
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton'
import { CategoryFilter } from '@/features/dashboard/CategoryFilter'
import { getUserSession } from '@/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const session = await getUserSession('/dashboard')
  if (!session) return null
  const userId = session.user.id
  const { category } = await searchParams
  const activeCategory = category ?? 'stickman'

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
      <CategoryFilter activeCategory={activeCategory} />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={userId} category={activeCategory} />
      </Suspense>
    </div>
  )
}
