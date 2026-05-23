'use client'

import { useCallback, useEffect, useState } from 'react'
import { StoryCard } from '@/features/dashboard/StoryCard'
import { EmptyDashboard } from '@/features/dashboard/EmptyDashboard'
import type { DashboardStory } from '@/lib/types/dashboard'
import { useRouter } from 'next/navigation'
interface StoryGridClientProps {
  stories: DashboardStory[]
  category: string
}

export function StoryGridClient({ stories: initialStories, category }: StoryGridClientProps) {
  const [stories, setStories] = useState(initialStories)
  const router = useRouter()
  useEffect(() => {
    setStories(initialStories)
  }, [initialStories])

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const handleDelete = useCallback(
    async (storyId: string) => {
      const snapshot = stories
      setStories((current) => current.filter((s) => s.id !== storyId))

      try {
        const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
        router.refresh()
      } catch (err) {
        setStories(snapshot)
        throw err
      }
    },
    [stories, router],
  )

  if (stories.length === 0) {
    return <EmptyDashboard category={category} />
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
      {stories.map((story) => (
        <StoryCard key={story.id} summary={story} onChange={refresh} onDelete={handleDelete} />
      ))}
    </div>
  )
}
