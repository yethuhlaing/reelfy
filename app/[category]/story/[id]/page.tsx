import { Workspace } from '@/components/workspace/Workspace'

export default async function StoryPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>
}) {
  const { category, id } = await params
  return <Workspace storyId={id} category={category} />
}
