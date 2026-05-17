import { TopBar } from '@/components/layout/TopBar'
import { StoryForm } from '@/components/story/StoryForm'

export default async function NewStoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  return (
    <>
      <TopBar title="New story" />
      <StoryForm category={category} />
    </>
  )
}
