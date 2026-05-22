import { Suspense } from 'react'
import { AdminDashboardContent } from '@/components/admin/AdminDashboardContent'
import { AdminSkeleton } from '@/components/admin/AdminSkeleton'
import { getUserSession } from '@/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getUserSession('/admin')
  if (!session) return null
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Suspense fallback={<AdminSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}
