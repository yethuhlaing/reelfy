'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

const CATEGORIES = [
  { id: 'stickman', label: 'Stickman', soon: false },
  { id: 'whiteboard', label: 'Whiteboard', soon: true },
  { id: 'comic', label: 'Comic', soon: true },
  { id: 'doodle', label: 'Doodle', soon: true },
] as const

export function CategoryFilter({ activeCategory }: { activeCategory: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => (
        <button
          key={category.id}
          disabled={category.soon}
          onClick={() => router.push(`/dashboard?category=${encodeURIComponent(category.id)}`)}
          className={cn(
            'inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition',
            category.id === activeCategory
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-foreground hover:bg-accent',
            category.soon && 'cursor-not-allowed opacity-50',
          )}
        >
          {category.label}
          {category.soon ? <span className="ml-2 text-xs text-muted-foreground">soon</span> : null}
        </button>
      ))}
    </div>
  )
}
