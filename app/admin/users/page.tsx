import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/features/ui/card'
import { UserSpendTable } from '@/features/admin/UserSpendTable'
import { getAdminUsers } from '@/lib/db/admin'
import { getUserSession } from '@/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams
  const session = await getUserSession('/admin/users')
  if (!session) return null
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return null
  }
  const data = await getAdminUsers(state)

  const title = state === 'unprofitable' ? 'Unprofitable Users' : 'User Spend'
  const description =
    state === 'unprofitable'
      ? 'Users with cumulative API cost higher than cumulative payments.'
      : 'Per-user profitability across revenue, API costs, and credits.'

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <UserSpendTable rows={data.users} />
        </CardContent>
      </Card>
    </div>
  )
}
