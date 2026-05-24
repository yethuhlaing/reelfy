import { DashboardSkeleton } from '@/features/stories/components/dashboard/DashboardSkeleton'

export default function LoadingDashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
      <DashboardSkeleton />
    </div>
  )
}
