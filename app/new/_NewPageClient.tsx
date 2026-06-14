'use client'

import { useState } from 'react'
import RuixenMoonChat from '@/features/dashboard/components/ai-chat'
import { StoryForm } from '@/features/stories/components/story/StoryForm'
import { LofiForm } from '@/features/lofi/components/LofiForm'
import { LofiStockForm } from '@/features/lofi-stock/components/LofiStockForm'

function CategoryForm({
  category,
  onBackToStart,
}: {
  category: string
  onBackToStart: () => void
}) {
  switch (category) {
    case 'lofi':
      return <LofiForm onBackToStart={onBackToStart} />
    case 'lofi-stock':
      return <LofiStockForm onBackToStart={onBackToStart} />
    default:
      return <StoryForm category={category} onBackToStart={onBackToStart} />
  }
}

export function NewPageClient() {
  const [category, setCategory] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)

  const transition = (fn: () => void) => {
    setVisible(false)
    setTimeout(() => {
      fn()
      requestAnimationFrame(() => setVisible(true))
    }, 180)
  }

  const selectCategory = (cat: string) => {
    transition(() => setCategory(cat))
  }

  const backToStart = () => {
    transition(() => setCategory(null))
  }

  return (
    <div
      className={`flex flex-1 flex-col transition-opacity duration-[180ms] ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {category ? (
        <div className="relative flex flex-1 items-start justify-center overflow-hidden bg-background px-6 py-8">
          <div className="w-full max-w-6xl">
            <CategoryForm category={category} onBackToStart={backToStart} />
          </div>
        </div>
      ) : (
        <RuixenMoonChat onCategorySelect={selectCategory} />
      )}
    </div>
  )
}
