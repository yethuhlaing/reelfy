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
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl">
          <StoryForm category={category} />
        </div>
      </div>
    </>
  )
}
