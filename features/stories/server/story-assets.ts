import { randomUUID } from 'node:crypto'
import {
  deleteStoryForUser,
  getStoryForUser,
  updateSceneForUser,
  updateStoryMeta,
  type StoredSceneRow,
  type StoredStoryRow,
} from '@/features/stories/server/stories-db'
import { deleteJobsForStory } from '@/shared/lib/jobs/store'
import {
  deleteByKeys,
  deleteByPrefix,
  isManagedUrl,
  uploadObject,
  urlToKey,
  type DeleteResult,
} from '@/shared/lib/storage/r2'
import { collectLofiBlobUrls, lofiAssetPrefixes } from '@/features/lofi/server/lofi-blob-assets'
import {
  getLofiAssetsForVideo,
  getLofiVideoByStoryId,
} from '@/features/lofi/server/lofi-db'

type DeleteAssetsResult = DeleteResult

function sceneImagePath(storyId: string, sceneId: string, ext: string): string {
  return `scenes/${storyId}/${sceneId}/${Date.now()}-${randomUUID()}.${ext}`
}

function sceneVoiceoverPath(storyId: string, sceneId: string): string {
  return `voiceovers/${storyId}/${sceneId}.mp3`
}

function sceneVideoPath(storyId: string, sceneId: string): string {
  return `animations/${storyId}/${sceneId}.mp4`
}

function thumbnailPath(storyId: string, ext: string): string {
  return `thumbnails/${storyId}.${ext}`
}

function composedVideoPath(storyId: string): string {
  return `composed/${storyId}.mp4`
}

const STICKMAN_ASSET_PREFIXES = (storyId: string) => [
  `thumbnails/${storyId}`,
  `scenes/${storyId}/`,
  `voiceovers/${storyId}/`,
  `animations/${storyId}/`,
  `animations/${storyId}-`,
  `composed/${storyId}`,
]

function storyAssetPrefixes(storyId: string, category?: string): string[] {
  const prefixes = STICKMAN_ASSET_PREFIXES(storyId)
  if (category === 'lofi' || category === 'lofi-stock') {
    prefixes.push(...lofiAssetPrefixes(storyId))
  }
  return prefixes
}

/** Collect object keys for the story's managed assets. */
function collectStoryAssetKeys(
  story: Pick<StoredStoryRow, 'thumbnailUrl' | 'composedVideoUrl'>,
  sceneRows: Pick<StoredSceneRow, 'imageUrl' | 'voiceoverUrl' | 'videoUrl'>[],
): string[] {
  const keys = new Set<string>()
  if (isManagedUrl(story.thumbnailUrl)) keys.add(urlToKey(story.thumbnailUrl))
  if (isManagedUrl(story.composedVideoUrl)) keys.add(urlToKey(story.composedVideoUrl))
  for (const scene of sceneRows) {
    if (isManagedUrl(scene.imageUrl)) keys.add(urlToKey(scene.imageUrl))
    if (isManagedUrl(scene.voiceoverUrl)) keys.add(urlToKey(scene.voiceoverUrl))
    if (isManagedUrl(scene.videoUrl)) keys.add(urlToKey(scene.videoUrl))
  }
  return [...keys]
}

async function deletePrefixSweep(prefixes: string[]): Promise<DeleteAssetsResult> {
  const summary: DeleteAssetsResult = { deleted: 0, failed: 0 }
  for (const prefix of prefixes) {
    const res = await deleteByPrefix(prefix)
    summary.deleted += res.deleted
    summary.failed += res.failed
  }
  return summary
}

/** Bust the CDN edge cache for overwrite-in-place assets by varying the query. */
function cacheBust(url: string): string {
  return `${url}?v=${Date.now()}`
}

async function uploadSceneVideo(
  storyId: string,
  sceneId: string,
  data: Buffer,
): Promise<string> {
  const url = await uploadObject(sceneVideoPath(storyId, sceneId), data, 'video/mp4')
  return cacheBust(url)
}

async function uploadSceneImage(
  storyId: string,
  sceneId: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split('/')[1] || 'png'
  // sceneImagePath carries a random suffix; each render is a new immutable object.
  return uploadObject(sceneImagePath(storyId, sceneId, ext), data, mimeType)
}

async function uploadSceneVoiceover(
  storyId: string,
  sceneId: string,
  data: Buffer,
): Promise<string> {
  return uploadObject(sceneVoiceoverPath(storyId, sceneId), data, 'audio/mpeg')
}

async function uploadThumbnail(
  storyId: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
  const url = await uploadObject(thumbnailPath(storyId, ext), data, mimeType)
  return cacheBust(url)
}

export async function uploadComposedVideo(storyId: string, data: Buffer): Promise<string> {
  const url = await uploadObject(composedVideoPath(storyId), data, 'video/mp4')
  return cacheBust(url)
}

async function persistSceneVideo(
  storyId: string,
  sceneId: string,
  userId: string,
  videoUrl: string,
): Promise<boolean> {
  return updateSceneForUser(storyId, sceneId, userId, { videoUrl })
}

export async function clearSceneVideo(
  storyId: string,
  sceneId: string,
  userId: string,
): Promise<boolean> {
  return updateSceneForUser(storyId, sceneId, userId, { videoUrl: null })
}

export async function completeSceneVideo(params: {
  storyId: string
  sceneId: string
  userId: string
  data: Buffer
}): Promise<string> {
  const videoUrl = await uploadSceneVideo(params.storyId, params.sceneId, params.data)
  const ok = await persistSceneVideo(params.storyId, params.sceneId, params.userId, videoUrl)
  if (!ok) {
    throw new Error('Failed to persist scene video URL')
  }
  return videoUrl
}

export async function completeComposedVideo(params: {
  storyId: string
  userId: string
  data: Buffer
}): Promise<string> {
  const videoUrl = await uploadComposedVideo(params.storyId, params.data)
  const ok = await updateStoryMeta(params.storyId, params.userId, {
    composedVideoUrl: videoUrl,
    status: 'rendered',
  })
  if (!ok) {
    throw new Error('Failed to persist composed video URL')
  }
  return videoUrl
}

export async function completeSceneImage(params: {
  storyId: string
  sceneId: string
  userId: string
  data: Buffer
  mimeType: string
}): Promise<string> {
  const imageUrl = await uploadSceneImage(params.storyId, params.sceneId, params.data, params.mimeType)
  const ok = await updateSceneForUser(params.storyId, params.sceneId, params.userId, { imageUrl })
  if (!ok) {
    throw new Error('Failed to persist scene image URL')
  }
  return imageUrl
}

export async function completeSceneVoiceover(params: {
  storyId: string
  sceneId: string
  userId: string
  data: Buffer
}): Promise<string> {
  const voiceoverUrl = await uploadSceneVoiceover(params.storyId, params.sceneId, params.data)
  const ok = await updateSceneForUser(params.storyId, params.sceneId, params.userId, { voiceoverUrl })
  if (!ok) {
    throw new Error('Failed to persist voiceover URL')
  }
  return voiceoverUrl
}

export async function completeThumbnail(params: {
  storyId: string
  userId: string
  data: Buffer
  mimeType: string
}): Promise<string> {
  const thumbnailUrl = await uploadThumbnail(params.storyId, params.data, params.mimeType)
  const ok = await updateStoryMeta(params.storyId, params.userId, { thumbnailUrl })
  if (!ok) {
    throw new Error('Failed to persist thumbnail URL')
  }
  return thumbnailUrl
}

async function deleteSceneAssets(
  scenes: Pick<StoredSceneRow, 'imageUrl' | 'voiceoverUrl' | 'videoUrl'>[],
): Promise<DeleteAssetsResult> {
  const keys: string[] = []
  for (const scene of scenes) {
    if (isManagedUrl(scene.imageUrl)) keys.push(urlToKey(scene.imageUrl))
    if (isManagedUrl(scene.voiceoverUrl)) keys.push(urlToKey(scene.voiceoverUrl))
    if (isManagedUrl(scene.videoUrl)) keys.push(urlToKey(scene.videoUrl))
  }
  return deleteByKeys(keys)
}

export async function clearStoryAssetsBeforeRegenerate(
  storyId: string,
  userId: string,
): Promise<void> {
  const existing = await getStoryForUser(storyId, userId)
  if (!existing) return

  const keys = collectStoryAssetKeys(existing.story, existing.scenes)
  await deleteByKeys(keys)
}

export async function deleteStoryWithAssets(
  storyId: string,
  userId: string,
): Promise<{ ok: true; summary: DeleteAssetsResult } | { ok: false; error: string; summary: DeleteAssetsResult }> {
  const result = await getStoryForUser(storyId, userId)
  if (!result) {
    return { ok: false, error: 'Not found', summary: { deleted: 0, failed: 0 } }
  }

  await deleteJobsForStory(storyId)

  const keySet = new Set(collectStoryAssetKeys(result.story, result.scenes))
  if (result.story.category === 'lofi' || result.story.category === 'lofi-stock') {
    const lofiVideo = await getLofiVideoByStoryId(storyId)
    if (lofiVideo) {
      const lofiAssets = await getLofiAssetsForVideo(lofiVideo.id)
      // collectLofiBlobUrls returns bare object keys.
      for (const key of collectLofiBlobUrls(lofiAssets, lofiVideo.finalVideoUrl)) {
        keySet.add(key)
      }
    }
  }
  const keySummary = await deleteByKeys([...keySet])
  const prefixSummary = await deletePrefixSweep(
    storyAssetPrefixes(storyId, result.story.category),
  )
  const summary: DeleteAssetsResult = {
    deleted: keySummary.deleted + prefixSummary.deleted,
    failed: keySummary.failed + prefixSummary.failed,
  }

  if (summary.failed > 0) {
    return { ok: false, error: 'Failed to delete some story assets', summary }
  }

  const deleted = await deleteStoryForUser(storyId, userId)
  if (!deleted) {
    return { ok: false, error: 'Not found', summary }
  }

  return { ok: true, summary }
}
