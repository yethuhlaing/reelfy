import { Workspace } from '@/features/workspace/components/Workspace'
import { LofiVideoView } from '@/features/lofi/components/LofiVideoView'

export default async function StoryPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>
}) {
  const { category, id } = await params

  if (category === 'lofi') {
    return <LofiVideoView id={id} />
  }

  return <Workspace storyId={id} category={category} />
}
