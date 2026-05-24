import { revalidatePath } from 'next/cache'
import { AdminDashboardContent } from '@/features/admin/components/AdminDashboardContent'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { getFreeCreditsOnSignup, setFreeCreditsOnSignup } from '@/shared/lib/db/config'
import { getUserSession } from '@/shared/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getUserSession('/admin')
  if (!session) return null
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return null
  }
  const freeCreditsOnSignup = await getFreeCreditsOnSignup()

  async function updateFreeCreditsConfig(formData: FormData) {
    'use server'

    const session = await getUserSession('/admin')
    if (!session?.user?.id) return
    const role = (session.user as { role?: string } | undefined)?.role
    if (role !== 'admin') return

    const rawValue = String(formData.get('freeCreditsOnSignup') ?? '0')
    const parsed = Number.parseInt(rawValue, 10)
    await setFreeCreditsOnSignup(parsed)
    revalidatePath('/admin')
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-7 pb-20 pt-7">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Free credits on signup</CardTitle>
          <CardDescription>
            Set signup bonus credits for new users. Use 0 to disable free credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <form action={updateFreeCreditsConfig} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-xs space-y-2">
              <label htmlFor="freeCreditsOnSignup" className="text-sm font-medium">
                Credits for new signups
              </label>
              <Input
                id="freeCreditsOnSignup"
                name="freeCreditsOnSignup"
                type="number"
                min={0}
                step={1}
                defaultValue={freeCreditsOnSignup}
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <AdminDashboardContent />
    </div>
  )
}
