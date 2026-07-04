import { notFound } from 'next/navigation'
import { MemeGenerationPageClient } from '@/features/meme/components/MemeGenerationPageClient'
import { getGenerationForUser } from '@/features/meme/server/memes-db'
import { getUserSession } from '@/shared/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function MemeDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getUserSession('/dashboard')
  if (!session) return null

  const generation = await getGenerationForUser(id, session.user.id)
  if (!generation) notFound()

  return <MemeGenerationPageClient generation={generation} />
}
