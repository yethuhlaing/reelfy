import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './index'
import { scenes, stories } from './schema'
import type { GenerateOptions, Scene, StoryData } from '@/lib/types'

export interface StoredStoryRow {
  id: string
  userId: string
  title: string
  tagline: string
  protagonist: string
  thumbnailUrl: string | null
  thumbnailPrompt: string | null
  sceneCount: number
  storyInput: string
  options: string
  composedVideoUrl: string | null
  category: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface StoredSceneRow {
  id: string
  storyId: string
  orderIndex: number
  imageUrl: string | null
  voiceoverUrl: string | null
  videoUrl: string | null
  sentence: string
  voiceoverText: string
  action: string
  setting: string
  emotion: string
  imagePrompt: string
  motionPrompt: string | null
  characters: number
  props: string
  voiceoverDuration: string | null
  imageModel: string | null
  videoModel: string | null
}

export async function listUserStories(userId: string, category?: string) {
  const where = category
    ? and(eq(stories.userId, userId), eq(stories.category, category))
    : eq(stories.userId, userId)
  return db.select().from(stories).where(where).orderBy(desc(stories.updatedAt))
}

export async function getStoryForUser(storyId: string, userId: string) {
  const rows = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .limit(1)
  const story = rows[0]
  if (!story) return null
  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.storyId, storyId))
    .orderBy(asc(scenes.orderIndex))
  return { story, scenes: sceneRows }
}

export async function deleteStoryForUser(storyId: string, userId: string) {
  const rows = await db
    .delete(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .returning({ id: stories.id })
  return rows.length > 0
}

export interface SaveStoryParams {
  storyId: string
  userId: string
  category: string
  storyInput: string
  options: GenerateOptions
  storyData: StoryData
  status?: string
}

export async function upsertStoryWithScenes(params: SaveStoryParams) {
  const { storyId, userId, category, storyInput, options, storyData, status } = params
  const now = new Date()
  const optsJson = JSON.stringify(options)

  await db
    .insert(stories)
    .values({
      id: storyId,
      userId,
      title: storyData.title,
      tagline: storyData.tagline,
      protagonist: storyData.protagonist,
      thumbnailUrl: storyData.thumbnailUrl ?? null,
      thumbnailPrompt: storyData.thumbnailPrompt ?? null,
      sceneCount: storyData.scenes.length,
      storyInput,
      options: optsJson,
      category,
      status: status ?? 'ready',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: stories.id,
      set: {
        title: storyData.title,
        tagline: storyData.tagline,
        protagonist: storyData.protagonist,
        thumbnailUrl: storyData.thumbnailUrl ?? null,
        thumbnailPrompt: storyData.thumbnailPrompt ?? null,
        sceneCount: storyData.scenes.length,
        storyInput,
        options: optsJson,
        category,
        status: status ?? 'ready',
        updatedAt: now,
      },
    })

  await db.delete(scenes).where(eq(scenes.storyId, storyId))
  if (storyData.scenes.length > 0) {
    await db.insert(scenes).values(
      storyData.scenes.map((sc, idx) => ({
        id: sc.id,
        storyId,
        orderIndex: idx,
        imageUrl: sc.imageUrl ?? null,
        voiceoverUrl: sc.voiceoverUrl ?? null,
        videoUrl: sc.videoUrl ?? null,
        sentence: sc.sentence,
        voiceoverText: sc.voiceover,
        action: sc.action,
        setting: sc.setting,
        emotion: sc.emotion,
        imagePrompt: sc.imagePrompt ?? '',
        motionPrompt: sc.motionPrompt ?? null,
        characters: sc.characters,
        props: JSON.stringify(sc.props ?? []),
        voiceoverDuration: sc.voiceoverDuration != null ? String(sc.voiceoverDuration) : null,
        imageModel: options.imageModel ?? null,
        videoModel: options.videoModel ?? null,
        createdAt: now,
      })),
    )
  }
}

export interface SceneUpdate {
  imageUrl?: string | null
  voiceoverUrl?: string | null
  videoUrl?: string | null
  voiceoverDuration?: number | null
}

export async function updateSceneForUser(
  storyId: string,
  sceneId: string,
  userId: string,
  patch: SceneUpdate,
): Promise<boolean> {
  const ownerCheck = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .limit(1)
  if (ownerCheck.length === 0) return false

  const set: Record<string, unknown> = {}
  if (patch.imageUrl !== undefined) set.imageUrl = patch.imageUrl
  if (patch.voiceoverUrl !== undefined) set.voiceoverUrl = patch.voiceoverUrl
  if (patch.videoUrl !== undefined) set.videoUrl = patch.videoUrl
  if (patch.voiceoverDuration !== undefined) {
    set.voiceoverDuration = patch.voiceoverDuration != null ? String(patch.voiceoverDuration) : null
  }
  if (Object.keys(set).length === 0) return true

  await db
    .update(scenes)
    .set(set)
    .where(and(eq(scenes.id, sceneId), eq(scenes.storyId, storyId)))

  await db
    .update(stories)
    .set({ updatedAt: new Date() })
    .where(eq(stories.id, storyId))

  return true
}

export async function updateStoryMeta(
  storyId: string,
  userId: string,
  patch: { title?: string; thumbnailUrl?: string | null; composedVideoUrl?: string | null; status?: string },
): Promise<boolean> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.title !== undefined) set.title = patch.title
  if (patch.thumbnailUrl !== undefined) set.thumbnailUrl = patch.thumbnailUrl
  if (patch.composedVideoUrl !== undefined) set.composedVideoUrl = patch.composedVideoUrl
  if (patch.status !== undefined) set.status = patch.status

  const rows = await db
    .update(stories)
    .set(set)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .returning({ id: stories.id })
  return rows.length > 0
}

export function rowToStoryData(
  story: StoredStoryRow,
  sceneRows: StoredSceneRow[],
): StoryData {
  return {
    title: story.title,
    tagline: story.tagline,
    protagonist: story.protagonist,
    thumbnailPrompt: story.thumbnailPrompt,
    thumbnailUrl: story.thumbnailUrl,
    scenes: sceneRows.map((sc) => sceneRowToScene(sc)),
  }
}

export function sceneRowToScene(sc: StoredSceneRow): Scene {
  let props: string[] = []
  try {
    const parsed = JSON.parse(sc.props)
    if (Array.isArray(parsed)) props = parsed
  } catch {}
  const characters = (sc.characters >= 1 && sc.characters <= 3 ? sc.characters : 1) as 1 | 2 | 3
  return {
    id: sc.id,
    sentence: sc.sentence,
    voiceover: sc.voiceoverText,
    action: sc.action,
    setting: sc.setting,
    emotion: sc.emotion as Scene['emotion'],
    characters,
    props,
    imagePrompt: sc.imagePrompt,
    motionPrompt: sc.motionPrompt ?? undefined,
    imageUrl: sc.imageUrl,
    voiceoverUrl: sc.voiceoverUrl,
    videoUrl: sc.videoUrl,
    voiceoverDuration: sc.voiceoverDuration != null ? Number(sc.voiceoverDuration) : undefined,
  }
}

export function parseOptions(raw: string): GenerateOptions | null {
  try {
    return JSON.parse(raw) as GenerateOptions
  } catch {
    return null
  }
}
