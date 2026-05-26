import { StoryForm } from '@/features/stories/components/story/StoryForm'
import { LofiForm } from '@/features/lofi/components/LofiForm'
import { LofiStockForm } from '@/features/lofi-stock/components/LofiStockForm'

function NewCategoryForm({ category }: { category: string }) {
  switch (category) {
    case 'lofi':
      return <LofiForm />
    case 'lofi-stock':
      return <LofiStockForm />
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
