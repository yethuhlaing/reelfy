import { listBrainrotProjectsForUser } from '@/features/brainrot/server/brainrot-db'
import { reconcileBrainrotExportFromFal } from '@/features/brainrot/server/export-finalize'
import { listGenerationsForUser } from '@/features/meme/server/memes-db'
import { listUserStories } from '@/features/stories/server/stories-db'
import { DashboardHero } from '@/features/stories/components/dashboard/DashboardHero'
import { StoryGridClient } from '@/features/stories/components/dashboard/StoryGridClient'
import type { DashboardGridItem, DashboardMeme, DashboardStory, DashboardBrainrot } from '@/shared/lib/types/dashboard'

interface DashboardContentProps {
  userId: string
}

export async function DashboardContent({ userId }: DashboardContentProps) {
  let [rows, generations, brainrotRows] = await Promise.all([
    listUserStories(userId),
    listGenerationsForUser(userId),
    listBrainrotProjectsForUser(userId),
  ])

  // Self-heal reels stuck in 'rendering' (missed completion webhook, common in
  // dev with no public URL) by polling fal directly, then re-read the fresh rows.
  const stuck = brainrotRows.filter((b) => b.status === 'rendering' && b.renderJobId)
  if (stuck.length > 0) {
    await Promise.all(
      stuck.map((b) => reconcileBrainrotExportFromFal(b.renderJobId!).catch(() => false)),
    )
    brainrotRows = await listBrainrotProjectsForUser(userId)
  }

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

  const brainrots: DashboardBrainrot[] = brainrotRows.map((b) => ({
    id: b.id,
    title: b.title || b.inputText.slice(0, 48) || 'Brainrot reel',
    inputText: b.inputText,
    previewUrl: b.outputVideoUrl ?? '',
    status: b.status,
    createdAt: new Date(b.createdAt).getTime(),
  }))

  const items: DashboardGridItem[] = [
    ...stories.map((story) => ({ kind: 'story' as const, createdAt: story.savedAt, story })),
    ...memes.map((meme) => ({ kind: 'meme' as const, createdAt: meme.createdAt, meme })),
    ...brainrots.map((brainrot) => ({
      kind: 'brainrot' as const,
      createdAt: brainrot.createdAt,
      brainrot,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt)

  const stats = {
    stories: stories.length + memes.length + brainrots.length,
    minutes: Math.round(stories.reduce((acc, s) => acc + s.totalVoiceoverSeconds, 0) / 60),
  }

  return (
    <>
      <DashboardHero stats={stats} />
      <StoryGridClient items={items} />
    </>
  )
}
