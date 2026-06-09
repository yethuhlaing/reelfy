'use client'

import { useEffect, useState } from 'react'
import RuixenMoonChat from '@/features/dashboard/components/ai-chat'
import { StoryForm } from '@/features/stories/components/story/StoryForm'
import { LofiForm } from '@/features/lofi/components/LofiForm'
import { LofiStockForm } from '@/features/lofi-stock/components/LofiStockForm'
import { DecorativeBackground } from '@/shared/ui/decorative-background'

function CategoryForm({ category }: { category: string }) {
  switch (category) {
    case 'lofi':
      return <LofiForm />
    case 'lofi-stock':
      return <LofiStockForm />
    default:
      return <StoryForm category={category} />
  }
}

export function NewPageClient({ category }: { category?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [category])

  if (category) {
    return (
      <div
        className={`relative z-30 flex flex-1 items-start justify-center overflow-hidden bg-background px-6 py-8 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <DecorativeBackground showFloatingChrome={true} />
        <div className="relative z-20 w-full max-w-6xl">
          <CategoryForm category={category} />
        </div>
      </div>
    )
  }

  return <RuixenMoonChat />
}
