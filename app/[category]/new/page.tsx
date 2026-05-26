import { StoryForm } from '@/features/stories/components/story/StoryForm'
import { LofiForm } from '@/features/lofi/components/LofiForm'

function NewCategoryForm({ category }: { category: string }) {
  switch (category) {
    case 'lofi':
      return <LofiForm />
    default:
      return <StoryForm category={category} />
  }
}

export default async function NewStoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-8">
      <div className="w-full max-w-6xl">
        <NewCategoryForm category={category} />
      </div>
    </div>
  )
}
