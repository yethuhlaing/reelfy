import { Workspace } from '@/features/workspace/components/Workspace'
import { LofiVideoView } from '@/features/lofi/components/LofiVideoView'

export default async function StoryPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>
}) {
  const { category, id } = await params

  if (category === 'lofi' || category === 'lofi-stock') {
    return <LofiVideoView id={id} category={category} />
  }

  return <Workspace storyId={id} category={category} />
}
