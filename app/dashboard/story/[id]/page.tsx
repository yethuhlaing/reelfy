import { notFound } from 'next/navigation'
import { LofiVideoView } from '@/features/lofi/components/LofiVideoView'
import { resolveStoryView } from '@/features/stories/server/story-view'
import { Workspace } from '@/features/workspace/components/Workspace'
import { getUserSession } from '@/shared/lib/db/user'

export default async function DashboardStoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getUserSession(`/dashboard/story/${id}`)
  if (!session) return null

  const view = await resolveStoryView(id, session.user.id)
  if (!view) notFound()

  if (view.type === 'lofi') {
    return <LofiVideoView id={view.videoId} category={view.category} />
  }

  return <Workspace storyId={view.storyId} category={view.category} />
}
