'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { StoryCard } from '@/components/dashboard/StoryCard'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'
import { useActiveCategory } from '@/components/layout/Sidebar'
import type { DashboardStory } from '@/lib/types/dashboard'

export default function DashboardPage() {
  const category = useActiveCategory()
  const [stories, setStories] = useState<DashboardStory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(() => {
    setIsLoading(true)
    fetch(`/api/stories?category=${encodeURIComponent(category)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ stories: DashboardStory[] }>
      })
      .then((data) => {
        if (!data?.stories) {
          setStories([])
          return
        }
        setStories(data.stories)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [category])

  const handleDelete = useCallback(async (storyId: string) => {
    let snapshot: DashboardStory[] | null = null
    setStories((current) => {
      snapshot = current
      return current.filter((s) => s.id !== storyId)
    })

    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      if (snapshot) setStories(snapshot)
      throw err
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const stats = {
    stories: stories.length,
    minutes: Math.round(stories.reduce((acc, s) => acc + s.totalVoiceoverSeconds, 0) / 60),
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
        <DashboardHero stats={stats} />

        {!isLoading && stories.length === 0 ? (
          <EmptyDashboard category={category} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
            {stories.map((s) => (
              <StoryCard key={s.id} summary={s} onChange={refresh} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
