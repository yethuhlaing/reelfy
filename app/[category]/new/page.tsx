import { StoryForm } from '@/features/stories/components/story/StoryForm'
import { LofiForm } from '@/features/lofi/components/LofiForm'
import { LofiStockForm } from '@/features/lofi-stock/components/LofiStockForm'
import { DecorativeBackground } from '@/shared/ui/decorative-background'

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
    <div className="relative flex min-h-screen flex-1 items-start justify-center overflow-hidden bg-background px-6 py-8">
      <DecorativeBackground showFloatingChrome={false} />
      <div className="relative z-20 w-full max-w-6xl">
        <NewCategoryForm category={category} />
      </div>
    </div>
  )
}
