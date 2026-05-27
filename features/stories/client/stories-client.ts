import type { GenerateOptions, Scene, StoryData, WordTiming } from '@/shared/lib/types'

export async function fetchStory(storyId: string): Promise<{
  storyInput: string
  options: GenerateOptions | null
  storyData: StoryData
  category: string
  composedVideoUrl?: string | null
} | null> {
  const res = await fetch(`/api/stories/${storyId}`)
  if (!res.ok) return null
  return res.json()
}

export async function patchStoryMeta(
  storyId: string,
  body: { title?: string; thumbnailUrl?: string | null; composedVideoUrl?: string | null; status?: string },
): Promise<boolean> {
  const res = await fetch(`/api/stories/${storyId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

export async function patchSceneFields(
  storyId: string,
  sceneId: string,
  body: {
    voiceoverDuration?: number | null
    voiceoverWordTimings?: WordTiming[] | null
    imagePrompt?: string
    motionPrompt?: string | null
    voiceover?: string
    imageUrl?: string | null
    videoUrl?: string | null
    voiceoverUrl?: string | null
  },
): Promise<boolean> {
  const res = await fetch(`/api/stories/${storyId}/scenes/${sceneId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

export async function duplicateStoryApi(storyId: string): Promise<string | null> {
  const res = await fetch(`/api/stories/${storyId}/duplicate`, { method: 'POST' })
  if (!res.ok) return null
  const data = (await res.json()) as { id?: string }
  return data.id ?? null
}
