import { getLofiVideoByStoryId } from '@/features/lofi/server/lofi-db'
import { getStoryForUser } from '@/features/stories/server/stories-db'

type LofiStoryView = {
  type: 'lofi'
  videoId: string
  category: 'lofi' | 'lofi-stock'
}

type WorkspaceStoryView = {
  type: 'workspace'
  storyId: string
  category: string
}

export type StoryView = LofiStoryView | WorkspaceStoryView

export async function resolveStoryView(storyId: string, userId: string): Promise<StoryView | null> {
  const result = await getStoryForUser(storyId, userId)
  if (!result) return null

  const category = result.story.category
  if (category === 'lofi' || category === 'lofi-stock') {
    const video = await getLofiVideoByStoryId(storyId)
    if (!video) return null
    return { type: 'lofi', videoId: video.id, category }
  }

  return { type: 'workspace', storyId, category }
}
