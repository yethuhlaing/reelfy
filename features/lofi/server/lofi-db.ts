import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, stories } from '@/shared/lib/db/schema'
import type { LofiVideoStatus, LofiAssetStatus, VisualMode } from '@/shared/lib/types'

export interface LofiVideoRow {
  id: string
  userId: string
  storyId: string
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualMode: string
  imageModel: string | null
  videoModel: string | null
  ambientBed: string | null
  status: string
  arrangementJson: string | null
  finalVideoUrl: string | null
  finalDurationSec: number | null
  creditsPreAuth: number
  creditsSettled: number
  costUsd: string
  createdAt: Date
  updatedAt: Date
}

export interface LofiAssetRow {
  id: string
  videoId: string
  kind: string
  orderIndex: number
  prompt: string
  model: string
  durationSec: number
  falJobId: string | null
  status: string
  retryCount: number
  errorMessage: string | null
  resultUrl: string | null
  creditsCharged: number
  costUsd: string
  createdAt: Date
}

export interface CreateLofiVideoInput {
  id: string
  userId: string
  storyId: string
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualMode: VisualMode
  imageModel: string | null
  videoModel: string | null
  ambientBed: string | null
  creditsPreAuth: number
}

export async function createLofiVideo(input: CreateLofiVideoInput) {
  await db.insert(lofiVideos).values({
    ...input,
    status: 'generating',
    costUsd: '0',
  })
}

export async function getLofiVideo(videoId: string) {
  const rows = await db
    .select()
    .from(lofiVideos)
    .where(eq(lofiVideos.id, videoId))
    .limit(1)
  return rows[0] ?? null
}

export async function getLofiVideoForUser(videoId: string, userId: string) {
  const rows = await db
    .select()
    .from(lofiVideos)
    .where(and(eq(lofiVideos.id, videoId), eq(lofiVideos.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function getLofiVideoByStoryId(storyId: string) {
  const rows = await db
    .select()
    .from(lofiVideos)
    .where(eq(lofiVideos.storyId, storyId))
    .limit(1)
  return rows[0] ?? null
}

export async function listUserLofiVideos(userId: string) {
  return db
    .select()
    .from(lofiVideos)
    .where(eq(lofiVideos.userId, userId))
    .orderBy(desc(lofiVideos.updatedAt))
}

export async function updateLofiVideoStatus(
  videoId: string,
  status: LofiVideoStatus,
) {
  await db
    .update(lofiVideos)
    .set({ status, updatedAt: new Date() })
    .where(eq(lofiVideos.id, videoId))
}

export async function updateLofiVideo(
  videoId: string,
  patch: Partial<{
    status: string
    arrangementJson: string | null
    finalVideoUrl: string | null
    finalDurationSec: number | null
    creditsSettled: number
    costUsd: string
    updatedAt: Date
  }>,
) {
  await db
    .update(lofiVideos)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(lofiVideos.id, videoId))
}

export async function claimVideoForRendering(videoId: string) {
  const rows = await db
    .update(lofiVideos)
    .set({ status: 'rendering', updatedAt: new Date() })
    .where(and(eq(lofiVideos.id, videoId), eq(lofiVideos.status, 'generating')))
    .returning({ id: lofiVideos.id })
  return rows.length > 0
}

export async function createLofiAssets(rows: {
  id: string
  videoId: string
  kind: string
  orderIndex: number
  prompt: string
  model: string
  durationSec: number
  costUsd: string
}[]) {
  await db.insert(lofiAssets).values(rows)
}

export async function getLofiAssetsForVideo(videoId: string) {
  return db
    .select()
    .from(lofiAssets)
    .where(eq(lofiAssets.videoId, videoId))
    .orderBy(asc(lofiAssets.orderIndex))
}

export async function getLofiAsset(assetId: string) {
  const rows = await db
    .select()
    .from(lofiAssets)
    .where(eq(lofiAssets.id, assetId))
    .limit(1)
  return rows[0] ?? null
}

export async function updateLofiAsset(
  assetId: string,
  patch: Partial<{
    status: string
    falJobId: string | null
    retryCount: number
    errorMessage: string | null
    resultUrl: string | null
    creditsCharged: number
    costUsd: string
  }>,
) {
  await db
    .update(lofiAssets)
    .set(patch)
    .where(eq(lofiAssets.id, assetId))
}

export async function getAssetFanInCounts(videoId: string) {
  const rows = await db
    .select({
      total: sql<number>`count(*)`,
      done: sql<number>`count(*) filter (where ${lofiAssets.status} in ('ready', 'failed', 'skipped'))`,
      ready: sql<number>`count(*) filter (where ${lofiAssets.status} = 'ready')`,
    })
    .from(lofiAssets)
    .where(eq(lofiAssets.videoId, videoId))
  return rows[0]
}

export async function createLofiStoryMirror(input: {
  id: string
  userId: string
  title: string
  tagline: string
}) {
  await db.insert(stories).values({
    id: input.id,
    userId: input.userId,
    title: input.title,
    tagline: input.tagline.slice(0, 120),
    protagonist: '',
    category: 'lofi',
    status: 'draft',
    composedVideoUrl: null,
    storyInput: input.tagline,
    options: '{}',
  })
}

export async function finalizeLofiVideo(videoId: string, blobUrl: string, durationSec: number) {
  const video = await getLofiVideo(videoId)
  if (!video) return

  await db.transaction(async (tx) => {
    await tx
      .update(lofiVideos)
      .set({ status: 'complete', finalVideoUrl: blobUrl, finalDurationSec: durationSec, updatedAt: new Date() })
      .where(eq(lofiVideos.id, videoId))
    await tx
      .update(stories)
      .set({ composedVideoUrl: blobUrl, status: 'ready', updatedAt: new Date() })
      .where(eq(stories.id, video.storyId))
  })
}
