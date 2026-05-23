import { AdminSkeleton } from '@/features/admin/AdminSkeleton'

export default function LoadingAdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <AdminSkeleton />
    </div>
  )
}
