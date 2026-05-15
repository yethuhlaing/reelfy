import type { Scene, StoryData, GenerateOptions } from './types'

const LIST_KEY = 'stickman:list'
const STORY_PREFIX = 'stickman:story:'
const MAX_STORIES = 5

export interface StoredStorySummary {
  id: string
  title: string
  tagline: string
  savedAt: number
}

export interface StoredStory {
  id: string
  storyInput: string
  options: GenerateOptions
  storyData: StoryData
  savedAt: number
  composedVideoUrl?: string | null
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJSON<T>(key: string): T | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (!isBrowser()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn('storage write failed', key, err)
    return false
  }
}

function removeKey(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function readList(): StoredStorySummary[] {
  return readJSON<StoredStorySummary[]>(LIST_KEY) ?? []
}

function writeList(list: StoredStorySummary[]): void {
  writeJSON(LIST_KEY, list)
}

export function listStories(): StoredStorySummary[] {
  return readList()
}

export function getStory(id: string): StoredStory | null {
  return readJSON<StoredStory>(STORY_PREFIX + id)
}

function stripDataUrl(value: string | null): string | null {
  if (!value) return value
  return value.startsWith('data:') ? null : value
}

function sanitizeStoryData(data: StoryData): StoryData {
  return {
    ...data,
    scenes: data.scenes.map((s) => ({
      ...s,
      imageUrl: stripDataUrl(s.imageUrl),
      voiceoverUrl: stripDataUrl(s.voiceoverUrl),
      videoUrl: s.videoUrl != null ? stripDataUrl(s.videoUrl) : s.videoUrl,
    })),
  }
}

function trySaveStored(id: string, stored: StoredStory): boolean {
  return writeJSON(STORY_PREFIX + id, stored)
}

export function saveStory(input: {
  id?: string
  storyInput: string
  options: GenerateOptions
  storyData: StoryData
}): StoredStory {
  const id =
    input.id ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  const savedAt = Date.now()
  const sanitized = sanitizeStoryData(input.storyData)
  const stored: StoredStory = {
    id,
    storyInput: input.storyInput,
    options: input.options,
    storyData: sanitized,
    savedAt,
  }

  const list = readList().filter((s) => s.id !== id)
  list.unshift({
    id,
    title: input.storyData.title,
    tagline: input.storyData.tagline,
    savedAt,
  })

  while (list.length > MAX_STORIES) {
    const evicted = list.pop()
    if (evicted) removeKey(STORY_PREFIX + evicted.id)
  }

  let ok = trySaveStored(id, stored)
  while (!ok && list.length > 1) {
    const evicted = list.pop()
    if (evicted) removeKey(STORY_PREFIX + evicted.id)
    ok = trySaveStored(id, stored)
  }
  writeList(list)
  return stored
}

export function updateStoryScene(id: string, sceneId: string, patch: Partial<Scene>): void {
  const stored = getStory(id)
  if (!stored) return
  stored.storyData = {
    ...stored.storyData,
    scenes: stored.storyData.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
  }
  writeJSON(STORY_PREFIX + id, stored)
}

export function updateThumbnail(id: string, url: string): void {
  const stored = getStory(id)
  if (!stored) return
  stored.storyData = {
    ...stored.storyData,
    thumbnailUrl: stripDataUrl(url),
  }
  writeJSON(STORY_PREFIX + id, stored)
}

export function updateComposedVideo(id: string, url: string): void {
  const stored = getStory(id)
  if (!stored) return
  stored.composedVideoUrl = url
  writeJSON(STORY_PREFIX + id, stored)
}

export function deleteStory(id: string): void {
  removeKey(STORY_PREFIX + id)
  writeList(readList().filter((s) => s.id !== id))
}

export function latestStoryId(): string | null {
  const list = readList()
  return list.length > 0 ? list[0].id : null
}
