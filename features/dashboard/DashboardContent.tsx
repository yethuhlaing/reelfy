import { listUserStories } from '@/lib/db/stories'
import { DashboardHero } from '@/features/dashboard/DashboardHero'
import { StoryGridClient } from '@/features/dashboard/StoryGridClient'
import type { DashboardStory } from '@/lib/types/dashboard'

interface DashboardContentProps {
  userId: string
  category: string
}

export async function DashboardContent({ userId, category }: DashboardContentProps) {
  const rows = await listUserStories(userId, category)
  const stories: DashboardStory[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    tagline: s.tagline,
    category: s.category,
    status: s.status as DashboardStory['status'],
    thumbnailUrl: s.thumbnailUrl,
    sceneCount: s.sceneCount,
    animatedCount: s.animatedCount,
    totalVoiceoverSeconds: s.totalVoiceoverSeconds,
    savedAt: s.createdAt.getTime(),
    lastUpdated: s.updatedAt.getTime(),
  }))

  const stats = {
    stories: stories.length,
    minutes: Math.round(stories.reduce((acc, s) => acc + s.totalVoiceoverSeconds, 0) / 60),
  }

  return (
    <>
      <DashboardHero stats={stats} />
      <StoryGridClient stories={stories} category={category} />
    </>
  )
}
