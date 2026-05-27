import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, stories } from '@/shared/lib/db/schema'
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

export async function getLofiAssetsForVideo(videoId: string) {
  return db
    .select()
    .from(lofiAssets)
    .where(eq(lofiAssets.videoId, videoId))
    .orderBy(asc(lofiAssets.orderIndex))
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
