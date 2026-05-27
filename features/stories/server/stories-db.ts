import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, scenes, stories } from '@/shared/lib/db/schema'
import type { GenerateOptions, Scene, StoryData } from '@/shared/lib/types'

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

export interface DashboardStoryRow {
  id: string
  title: string
  tagline: string
  category: string
  status: string
  thumbnailUrl: string | null
  sceneCount: number
  animatedCount: number
  totalVoiceoverSeconds: number
  createdAt: Date
  updatedAt: Date
  lofiVideoId: string | null
}

export async function listUserStories(userId: string, category?: string) {
  const where = category
    ? and(eq(stories.userId, userId), eq(stories.category, category))
    : eq(stories.userId, userId)
  const storyRows = await db.select().from(stories).where(where).orderBy(desc(stories.updatedAt))
  if (storyRows.length === 0) return [] as DashboardStoryRow[]

  const storyIds = storyRows.map((s) => s.id)

  const lofiStoryIds = storyRows
    .filter((s) => s.category === 'lofi' || s.category === 'lofi-stock')
    .map((s) => s.id)

  const lofiVideoIdByStory = new Map<string, string>()
  const lofiThumbnailByStory = new Map<string, string>()

  if (lofiStoryIds.length > 0) {
    const lofiVideoRows = await db
      .select({ id: lofiVideos.id, storyId: lofiVideos.storyId })
      .from(lofiVideos)
      .where(inArray(lofiVideos.storyId, lofiStoryIds))

    const videoIds: string[] = []
    for (const row of lofiVideoRows) {
      lofiVideoIdByStory.set(row.storyId, row.id)
      videoIds.push(row.id)
    }

    if (videoIds.length > 0) {
      const visualRows = await db
        .select({ videoId: lofiAssets.videoId, resultUrl: lofiAssets.resultUrl })
        .from(lofiAssets)
        .where(
          and(
            inArray(lofiAssets.videoId, videoIds),
            eq(lofiAssets.kind, 'visual'),
            eq(lofiAssets.status, 'ready'),
          ),
        )
        .orderBy(asc(lofiAssets.videoId), asc(lofiAssets.orderIndex))

      for (const row of visualRows) {
        if (!lofiThumbnailByStory.has(row.videoId) && row.resultUrl) {
          lofiThumbnailByStory.set(row.videoId, row.resultUrl)
        }
      }
    }
  }

  const sceneRows = await db
    .select({
      storyId: scenes.storyId,
      orderIndex: scenes.orderIndex,
      imageUrl: scenes.imageUrl,
      videoUrl: scenes.videoUrl,
      voiceoverDuration: scenes.voiceoverDuration,
    })
    .from(scenes)
    .where(inArray(scenes.storyId, storyIds))
    .orderBy(asc(scenes.storyId), asc(scenes.orderIndex))

  const sceneCountByStory = new Map<string, number>()
  const animatedCountByStory = new Map<string, number>()
  const totalVoiceoverSecondsByStory = new Map<string, number>()
  const firstSceneImageByStory = new Map<string, string>()
  for (const row of sceneRows) {
    sceneCountByStory.set(row.storyId, (sceneCountByStory.get(row.storyId) ?? 0) + 1)
    if (row.videoUrl) {
      animatedCountByStory.set(row.storyId, (animatedCountByStory.get(row.storyId) ?? 0) + 1)
    }
    if (row.voiceoverDuration != null) {
      totalVoiceoverSecondsByStory.set(
        row.storyId,
        (totalVoiceoverSecondsByStory.get(row.storyId) ?? 0) + Number(row.voiceoverDuration),
      )
    }
    if (row.imageUrl && !firstSceneImageByStory.has(row.storyId)) {
      firstSceneImageByStory.set(row.storyId, row.imageUrl)
    }
  }

  return storyRows.map((story): DashboardStoryRow => {
    const sceneCount = sceneCountByStory.get(story.id) ?? 0
    const lofiVideoId = lofiVideoIdByStory.get(story.id) ?? null
    const lofiThumb = lofiVideoId ? (lofiThumbnailByStory.get(lofiVideoId) ?? null) : null
    return {
      id: story.id,
      title: story.title,
      tagline: story.tagline,
      category: story.category,
      status: story.status,
      thumbnailUrl: story.thumbnailUrl ?? lofiThumb ?? firstSceneImageByStory.get(story.id) ?? null,
      sceneCount,
      animatedCount: animatedCountByStory.get(story.id) ?? 0,
      totalVoiceoverSeconds: totalVoiceoverSecondsByStory.get(story.id) ?? 0,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      lofiVideoId,
    }
  })
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

export async function duplicateStoryForUser(storyId: string, userId: string): Promise<string | null> {
  const result = await getStoryForUser(storyId, userId)
  if (!result) return null

  const { story, scenes: sceneRows } = result
  const newStoryId = crypto.randomUUID()
  const now = new Date()
  const storyData = rowToStoryData(story, sceneRows)
  storyData.title = `${storyData.title} (copy)`

  await db.insert(stories).values({
    id: newStoryId,
    userId,
    title: storyData.title,
    tagline: storyData.tagline,
    protagonist: storyData.protagonist,
    thumbnailUrl: story.thumbnailUrl,
    thumbnailPrompt: story.thumbnailPrompt,
    sceneCount: sceneRows.length,
    storyInput: story.storyInput,
    options: story.options,
    composedVideoUrl: story.composedVideoUrl,
    category: story.category,
    status: story.status,
    createdAt: now,
    updatedAt: now,
  })

  if (sceneRows.length > 0) {
    await db.insert(scenes).values(
      sceneRows.map((sc) => ({
        id: crypto.randomUUID(),
        storyId: newStoryId,
        orderIndex: sc.orderIndex,
        imageUrl: sc.imageUrl,
        voiceoverUrl: sc.voiceoverUrl,
        videoUrl: sc.videoUrl,
        sentence: sc.sentence,
        voiceoverText: sc.voiceoverText,
        action: sc.action,
        setting: sc.setting,
        emotion: sc.emotion,
        imagePrompt: sc.imagePrompt,
        motionPrompt: sc.motionPrompt,
        characters: sc.characters,
        props: sc.props,
        voiceoverDuration: sc.voiceoverDuration,
        imageModel: sc.imageModel,
        videoModel: sc.videoModel,
        createdAt: now,
      })),
    )
  }

  return newStoryId
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
  imagePrompt?: string
  motionPrompt?: string | null
  voiceoverText?: string
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
  if (patch.imagePrompt !== undefined) set.imagePrompt = patch.imagePrompt
  if (patch.motionPrompt !== undefined) set.motionPrompt = patch.motionPrompt
  if (patch.voiceoverText !== undefined) set.voiceoverText = patch.voiceoverText
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

export async function updateStoryVoice(
  storyId: string,
  userId: string,
  voiceId: string | null,
): Promise<boolean> {
  const row = await db
    .select({ options: stories.options })
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .limit(1)
  if (!row.length) return false

  const current = parseOptions(row[0].options) ?? {}
  const updated = voiceId === null
    ? (({ voiceId: _, ...rest }) => rest)(current as typeof current & { voiceId?: string })
    : { ...current, voiceId }

  const rows = await db
    .update(stories)
    .set({ options: JSON.stringify(updated), updatedAt: new Date() })
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
