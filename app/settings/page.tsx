import { eq } from 'drizzle-orm'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { db } from '@/lib/db'
import { getCredits } from '@/lib/db/credits'
import { account } from '@/lib/db/schema'
import { getUserSession } from '@/lib/db/user'

export default async function SettingsPage() {
  const session = await getUserSession('/settings')
  if (!session?.user?.id) return null

  const userId = session.user.id
  const [credits, accounts] = await Promise.all([
    getCredits(userId),
    db
      .select({
        id: account.id,
        providerId: account.providerId,
        createdAt: account.createdAt,
      })
      .from(account)
      .where(eq(account.userId, userId)),
  ])

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
      <SettingsPanel
        initialProfile={{
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? '',
        }}
        credits={credits}
        connectedAccounts={accounts.map((item) => ({
          id: item.id,
          provider: item.providerId,
          connectedAt: item.createdAt.getTime(),
        }))}
      />
    </div>
  )
}
