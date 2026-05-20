'use client'

import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { StoryCard } from '@/components/dashboard/StoryCard'
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard'
import { useActiveCategory } from '@/components/layout/Sidebar'
import { listStories, getStory, type StoredStorySummary } from '@/lib/storage'

export default function DashboardPage() {
  const category = useActiveCategory()
  const [stories, setStories] = useState<StoredStorySummary[]>([])
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(() => {
    setStories(listStories(category))
    fetch(`/api/stories?category=${encodeURIComponent(category)}`)
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ stories: StoredStorySummary[] }>
      })
      .then((data) => {
        if (!data?.stories) return
        const localList = listStories(category)
        const byId = new Map<string, StoredStorySummary>()
        for (const s of data.stories) byId.set(s.id, s)
        for (const s of localList) {
          if (!byId.has(s.id)) byId.set(s.id, s)
        }
        const merged = Array.from(byId.values()).sort(
          (a, b) => (b.lastUpdated ?? b.savedAt) - (a.lastUpdated ?? a.savedAt),
        )
        setStories(merged)
      })
      .catch(() => {})
  }, [category])

  useEffect(() => {
    setHydrated(true)
    refresh()
  }, [refresh])

  const stats = {
    stories: stories.length,
    minutes: Math.round(
      stories.reduce((acc, s) => {
        const data = getStory(s.id)
        if (!data) return acc
        return acc + data.storyData.scenes.reduce((a, sc) => a + (sc.voiceoverDuration ?? 0), 0)
      }, 0) / 60,
    ),
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
        <DashboardHero stats={stats} />

        {hydrated && stories.length === 0 ? (
          <EmptyDashboard category={category} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
            {stories.map((s) => (
              <StoryCard key={s.id} summary={s} onChange={refresh} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
