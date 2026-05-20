import type { Scene, StoryData, GenerateOptions } from './types'

const LIST_KEY = 'stickman:list'
const STORY_PREFIX = 'stickman:story:'
const PENDING_PREFIX = 'stickman:pending:'
const MAX_STORIES = 20
const DEFAULT_CATEGORY = 'stickman'

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'rendered' | 'failed'

export interface StoredStorySummary {
  id: string
  title: string
  tagline: string
  savedAt: number
  category: string
  status?: StoryStatus
  lastUpdated?: number
}

export interface StoredStory {
  id: string
  storyInput: string
  options: GenerateOptions
  storyData: StoryData
  savedAt: number
  category: string
  composedVideoUrl?: string | null
  lastUpdated?: number
}

export interface PendingStory {
  id: string
  category: string
  storyInput: string
  options: GenerateOptions
  createdAt: number
}

export interface StorySummary {
  status: StoryStatus
  sceneCount: number
  animatedCount: number
  voicedCount: number
  updatedAt: number
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
  const raw = readJSON<StoredStorySummary[]>(LIST_KEY) ?? []
  return raw.map((s) => ({ ...s, category: s.category ?? DEFAULT_CATEGORY }))
}

function writeList(list: StoredStorySummary[]): void {
  writeJSON(LIST_KEY, list)
}

export function listStories(category?: string): StoredStorySummary[] {
  const all = readList()
  return category ? all.filter((s) => s.category === category) : all
}

export function getStory(id: string): StoredStory | null {
  const s = readJSON<StoredStory>(STORY_PREFIX + id)
  if (!s) return null
  if (!s.category) s.category = DEFAULT_CATEGORY
  return s
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
  category?: string
}): StoredStory {
  const id =
    input.id ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36))
  const savedAt = Date.now()
  const category = input.category ?? DEFAULT_CATEGORY
  const sanitized = sanitizeStoryData(input.storyData)
  const stored: StoredStory = {
    id,
    storyInput: input.storyInput,
    options: input.options,
    storyData: sanitized,
    savedAt,
    category,
    lastUpdated: savedAt,
  }

  const list = readList().filter((s) => s.id !== id)
  list.unshift({
    id,
    title: input.storyData.title,
    tagline: input.storyData.tagline,
    savedAt,
    category,
    status: deriveStatus(sanitized, !!stored.composedVideoUrl),
    lastUpdated: savedAt,
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

function bumpSummary(id: string, patch: Partial<StoredStorySummary>): void {
  const list = readList().map((s) => (s.id === id ? { ...s, ...patch } : s))
  writeList(list)
}

export function updateStoryScene(id: string, sceneId: string, patch: Partial<Scene>): void {
  const stored = getStory(id)
  if (stored) {
    stored.storyData = {
      ...stored.storyData,
      scenes: stored.storyData.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }
    stored.lastUpdated = Date.now()
    writeJSON(STORY_PREFIX + id, stored)
    bumpSummary(id, {
      status: deriveStatus(stored.storyData, !!stored.composedVideoUrl),
      lastUpdated: stored.lastUpdated,
    })
  }
  const dbPatch: Record<string, unknown> = {}
  if ('imageUrl' in patch) dbPatch.imageUrl = patch.imageUrl ?? null
  if ('voiceoverUrl' in patch) dbPatch.voiceoverUrl = patch.voiceoverUrl ?? null
  if ('videoUrl' in patch) dbPatch.videoUrl = patch.videoUrl ?? null
  if ('voiceoverDuration' in patch) dbPatch.voiceoverDuration = patch.voiceoverDuration ?? null
  if (Object.keys(dbPatch).length > 0 && isBrowser()) {
    fetch(`/api/stories/${id}/scenes/${sceneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbPatch),
    }).catch(() => {})
  }
}

function patchStoryRemote(id: string, body: Record<string, unknown>): void {
  if (!isBrowser()) return
  fetch(`/api/stories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export function updateThumbnail(id: string, url: string): void {
  const cleaned = stripDataUrl(url)
  const stored = getStory(id)
  if (stored) {
    stored.storyData = { ...stored.storyData, thumbnailUrl: cleaned }
    stored.lastUpdated = Date.now()
    writeJSON(STORY_PREFIX + id, stored)
    bumpSummary(id, { lastUpdated: stored.lastUpdated })
  }
  patchStoryRemote(id, { thumbnailUrl: cleaned })
}

export function updateComposedVideo(id: string, url: string): void {
  const stored = getStory(id)
  if (stored) {
    stored.composedVideoUrl = url
    stored.lastUpdated = Date.now()
    writeJSON(STORY_PREFIX + id, stored)
    bumpSummary(id, {
      status: deriveStatus(stored.storyData, true),
      lastUpdated: stored.lastUpdated,
    })
  }
  patchStoryRemote(id, { composedVideoUrl: url, status: 'rendered' })
}

export function renameStory(id: string, title: string): void {
  const stored = getStory(id)
  if (stored) {
    stored.storyData = { ...stored.storyData, title }
    stored.lastUpdated = Date.now()
    writeJSON(STORY_PREFIX + id, stored)
    bumpSummary(id, { title, lastUpdated: stored.lastUpdated })
  }
  patchStoryRemote(id, { title })
}

export function duplicateStory(id: string): string | null {
  const stored = getStory(id)
  if (!stored) return null
  const copy = saveStory({
    storyInput: stored.storyInput,
    options: stored.options,
    storyData: { ...stored.storyData, title: stored.storyData.title + ' (copy)' },
    category: stored.category,
  })
  return copy.id
}

export function deleteStory(id: string): void {
  removeKey(STORY_PREFIX + id)
  writeList(readList().filter((s) => s.id !== id))
}

export function latestStoryId(category?: string): string | null {
  const list = category ? listStories(category) : readList()
  return list.length > 0 ? list[0].id : null
}

function deriveStatus(data: StoryData, composed: boolean): StoryStatus {
  if (composed) return 'rendered'
  if (!data.scenes.length) return 'draft'
  const allImg = data.scenes.every((s) => !!s.imageUrl)
  const allVo = data.scenes.every((s) => !!s.voiceoverUrl)
  const anyErr = data.scenes.some((s) => !!s.lastError)
  if (anyErr && !allImg) return 'failed'
  if (allImg && allVo) return 'ready'
  return 'draft'
}

export function getStorySummary(id: string): StorySummary | null {
  const s = getStory(id)
  if (!s) return null
  const scenes = s.storyData.scenes
  return {
    status: deriveStatus(s.storyData, !!s.composedVideoUrl),
    sceneCount: scenes.length,
    animatedCount: scenes.filter((x) => !!x.videoUrl).length,
    voicedCount: scenes.filter((x) => !!x.voiceoverUrl).length,
    updatedAt: s.lastUpdated ?? s.savedAt,
  }
}

export function savePendingStory(p: PendingStory): void {
  writeJSON(PENDING_PREFIX + p.id, p)
}

export function getPendingStory(id: string): PendingStory | null {
  return readJSON<PendingStory>(PENDING_PREFIX + id)
}

export function clearPendingStory(id: string): void {
  removeKey(PENDING_PREFIX + id)
}
