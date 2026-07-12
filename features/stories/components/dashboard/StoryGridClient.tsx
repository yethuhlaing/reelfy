'use client'

import { useCallback, useEffect, useState } from 'react'
import { StoryCard } from '@/features/stories/components/dashboard/StoryCard'
import { MemeCard } from '@/features/meme/components/MemeCard'
import { BrainrotCard } from '@/features/brainrot/components/BrainrotCard'
import { EmptyDashboard } from '@/features/stories/components/dashboard/EmptyDashboard'
import type { DashboardGridItem } from '@/shared/lib/types/dashboard'
import { useRouter } from 'next/navigation'

interface StoryGridClientProps {
  items: DashboardGridItem[]
}

export function StoryGridClient({ items: initialItems }: StoryGridClientProps) {
  const [items, setItems] = useState(initialItems)
  const router = useRouter()

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleDeleteStory = useCallback(
    async (storyId: string) => {
      const snapshot = items
      setItems((current) => current.filter((item) => item.kind !== 'story' || item.story.id !== storyId))

      try {
        const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
      } catch (err) {
        setItems(snapshot)
        throw err
      }
    },
    [items, router],
  )

  const handleDeleteMeme = useCallback(
    async (memeId: string) => {
      const snapshot = items
      setItems((current) => current.filter((item) => item.kind !== 'meme' || item.meme.id !== memeId))

      try {
        const res = await fetch(`/api/memes/${memeId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        router.refresh()
      } catch (err) {
        setItems(snapshot)
        throw err
      }
    },
    [items, router],
  )

  const handleDeleteBrainrot = useCallback(
    async (brainrotId: string) => {
      const snapshot = items
      setItems((current) =>
        current.filter((item) => item.kind !== 'brainrot' || item.brainrot.id !== brainrotId),
      )
      try {
        const res = await fetch(`/api/brainrot/${brainrotId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        router.refresh()
      } catch (err) {
        setItems(snapshot)
        throw err
      }
    },
    [items, router],
  )

  if (items.length === 0) {
    return <EmptyDashboard />
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
      {items.map((item) => {
        if (item.kind === 'story') {
          return (
            <StoryCard
              key={`story-${item.story.id}`}
              summary={item.story}
              onChange={refresh}
              onDelete={handleDeleteStory}
            />
          )
        }
        if (item.kind === 'meme') {
          return (
            <MemeCard key={`meme-${item.meme.id}`} meme={item.meme} onDelete={handleDeleteMeme} />
          )
        }
        return (
          <BrainrotCard
            key={`brainrot-${item.brainrot.id}`}
            brainrot={item.brainrot}
            onDelete={handleDeleteBrainrot}
          />
        )
      })}
    </div>
  )
}
