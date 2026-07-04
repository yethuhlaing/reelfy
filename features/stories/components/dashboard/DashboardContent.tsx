import { listGenerationsForUser } from '@/features/meme/server/memes-db'
import { listUserStories } from '@/features/stories/server/stories-db'
import { DashboardHero } from '@/features/stories/components/dashboard/DashboardHero'
import { StoryGridClient } from '@/features/stories/components/dashboard/StoryGridClient'
import type { DashboardGridItem, DashboardMeme, DashboardStory } from '@/shared/lib/types/dashboard'

interface DashboardContentProps {
  userId: string
}

export async function DashboardContent({ userId }: DashboardContentProps) {
  const [rows, generations] = await Promise.all([
    listUserStories(userId),
    listGenerationsForUser(userId),
  ])

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

  const memes: DashboardMeme[] = generations.map((g) => ({
    id: g.id,
    inputText: g.inputText,
    previewUrl: g.variants[0]?.renderedUrl ?? '',
    variantCount: g.variants.length,
    createdAt: new Date(g.createdAt).getTime(),
  }))

  const items: DashboardGridItem[] = [
    ...stories.map((story) => ({ kind: 'story' as const, createdAt: story.savedAt, story })),
    ...memes.map((meme) => ({ kind: 'meme' as const, createdAt: meme.createdAt, meme })),
  ].sort((a, b) => b.createdAt - a.createdAt)

  const stats = {
    stories: stories.length + memes.length,
    minutes: Math.round(stories.reduce((acc, s) => acc + s.totalVoiceoverSeconds, 0) / 60),
  }

  return (
    <>
      <DashboardHero stats={stats} />
      <StoryGridClient items={items} />
    </>
  )
}
