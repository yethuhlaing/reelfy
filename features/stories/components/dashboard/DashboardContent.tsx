import { listUserStories } from '@/features/stories/server/stories-db'
import { DashboardHero } from '@/features/stories/components/dashboard/DashboardHero'
import { StoryGridClient } from '@/features/stories/components/dashboard/StoryGridClient'
import type { DashboardStory } from '@/shared/lib/types/dashboard'

interface DashboardContentProps {
  userId: string
}

export async function DashboardContent({ userId }: DashboardContentProps) {
  const rows = await listUserStories(userId)
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
    lofiVideoId: s.lofiVideoId,
  }))

  const stats = {
    stories: stories.length,
    minutes: Math.round(stories.reduce((acc, s) => acc + s.totalVoiceoverSeconds, 0) / 60),
  }

  return (
    <>
      <DashboardHero stats={stats} />
      <StoryGridClient stories={stories} />
    </>
  )
}
