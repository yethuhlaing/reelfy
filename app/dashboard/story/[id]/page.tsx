import { notFound } from 'next/navigation'
import { LofiVideoView } from '@/features/lofi/components/LofiVideoView'
import { resolveStoryView } from '@/features/stories/server/story-view'
import { Workspace } from '@/features/workspace/components/Workspace'
import { getUserSession } from '@/shared/lib/db/user'

export default async function DashboardStoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ starting?: string; category?: string }>
}) {
  const { id } = await params
  const { starting, category } = await searchParams
  const isStarting = starting === '1'
  const session = await getUserSession(`/dashboard/story/${id}`)
  if (!session) return null

  const view = await resolveStoryView(id, session.user.id)
  if (!view) {
    if (isStarting) {
      return <Workspace storyId={id} category={category ?? 'stickman'} />
    }
    notFound()
  }

  if (view.type === 'lofi') {
    return <LofiVideoView id={view.videoId} category={view.category} />
  }

  return <Workspace storyId={view.storyId} category={view.category} />
}
