import { del, list, put } from '@vercel/blob'
import {
  deleteStoryForUser,
  getStoryForUser,
  updateSceneForUser,
  updateStoryMeta,
  type StoredSceneRow,
  type StoredStoryRow,
} from '@/features/stories/server/stories-db'
import { deleteJobsForStory } from '@/shared/lib/jobs/store'

const BLOB_HOST = 'blob.vercel-storage.com'

export interface DeleteAssetsResult {
  deleted: number
  failed: number
}

function hasBlobToken(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

function stripQuery(url: string): string {
  return url.split('?')[0] ?? url
}

export function isBlobUrl(url: string | null | undefined): url is string {
  if (!url || url.startsWith('data:')) return false
  try {
    return new URL(url).hostname.includes(BLOB_HOST)
  } catch {
    return false
  }
}

export function sceneImagePath(storyId: string, sceneId: string, ext: string): string {
  return `scenes/${storyId}/${sceneId}/${Date.now()}.${ext}`
}

export function sceneVoiceoverPath(storyId: string, sceneId: string): string {
  return `voiceovers/${storyId}/${sceneId}.mp3`
}

export function sceneVideoPath(storyId: string, sceneId: string): string {
  return `animations/${storyId}/${sceneId}.mp4`
}

export function thumbnailPath(storyId: string, ext: string): string {
  return `thumbnails/${storyId}.${ext}`
}

export function composedVideoPath(storyId: string): string {
  return `composed/${storyId}.mp4`
}

export function storyAssetPrefixes(storyId: string): string[] {
  return [
    `thumbnails/${storyId}`,
    `scenes/${storyId}/`,
    `voiceovers/${storyId}/`,
    `animations/${storyId}/`,
    `animations/${storyId}-`,
    `composed/${storyId}`,
  ]
}

export function collectStoryAssetUrls(
  story: Pick<StoredStoryRow, 'thumbnailUrl' | 'composedVideoUrl'>,
  sceneRows: Pick<StoredSceneRow, 'imageUrl' | 'voiceoverUrl' | 'videoUrl'>[],
): string[] {
  const urls = new Set<string>()
  if (isBlobUrl(story.thumbnailUrl)) urls.add(stripQuery(story.thumbnailUrl))
  if (isBlobUrl(story.composedVideoUrl)) urls.add(stripQuery(story.composedVideoUrl))
  for (const scene of sceneRows) {
    if (isBlobUrl(scene.imageUrl)) urls.add(stripQuery(scene.imageUrl))
    if (isBlobUrl(scene.voiceoverUrl)) urls.add(stripQuery(scene.voiceoverUrl))
    if (isBlobUrl(scene.videoUrl)) urls.add(stripQuery(scene.videoUrl))
  }
  return [...urls]
}

export async function deleteBlobUrls(urls: string[]): Promise<DeleteAssetsResult> {
  const summary: DeleteAssetsResult = { deleted: 0, failed: 0 }
  for (const url of urls) {
    try {
      await del(url)
      summary.deleted += 1
    } catch {
      summary.failed += 1
    }
  }
  return summary
}

export async function deletePrefixSweep(
  prefixes: string[],
): Promise<DeleteAssetsResult> {
  const summary: DeleteAssetsResult = { deleted: 0, failed: 0 }
  for (const prefix of prefixes) {
    try {
      const { blobs } = await list({ prefix })
      for (const blob of blobs) {
        try {
          await del(blob.url)
          summary.deleted += 1
        } catch {
          summary.failed += 1
        }
      }
    } catch {
      summary.failed += 1
    }
  }
  return summary
}

export async function uploadSceneVideo(
  storyId: string,
  sceneId: string,
  data: Buffer,
): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const blob = await put(sceneVideoPath(storyId, sceneId), data, {
    access: 'public',
    contentType: 'video/mp4',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return `${blob.url}?v=${Date.now()}`
}

export async function uploadSceneImage(
  storyId: string,
  sceneId: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const ext = mimeType.split('/')[1] || 'png'
  const blob = await put(sceneImagePath(storyId, sceneId, ext), data, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: true,
  })
  return blob.url
}

export async function uploadSceneVoiceover(
  storyId: string,
  sceneId: string,
  data: Buffer,
): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const blob = await put(sceneVoiceoverPath(storyId, sceneId), data, {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

export async function uploadThumbnail(
  storyId: string,
  data: Buffer,
  mimeType: string,
): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
  const blob = await put(thumbnailPath(storyId, ext), data, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return `${blob.url}?v=${Date.now()}`
}

export async function uploadComposedVideo(storyId: string, data: Buffer): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const blob = await put(composedVideoPath(storyId), data, {
    access: 'public',
    contentType: 'video/mp4',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return `${blob.url}?v=${Date.now()}`
}

export async function persistSceneVideo(
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

export async function deleteSceneAssets(
  scenes: Pick<StoredSceneRow, 'imageUrl' | 'voiceoverUrl' | 'videoUrl'>[],
): Promise<DeleteAssetsResult> {
  const urls: string[] = []
  for (const scene of scenes) {
    if (isBlobUrl(scene.imageUrl)) urls.push(stripQuery(scene.imageUrl))
    if (isBlobUrl(scene.voiceoverUrl)) urls.push(stripQuery(scene.voiceoverUrl))
    if (isBlobUrl(scene.videoUrl)) urls.push(stripQuery(scene.videoUrl))
  }
  return deleteBlobUrls(urls)
}

export async function clearStoryAssetsBeforeRegenerate(
  storyId: string,
  userId: string,
): Promise<void> {
  const existing = await getStoryForUser(storyId, userId)
  if (!existing) return

  const urls = collectStoryAssetUrls(existing.story, existing.scenes)
  await deleteBlobUrls(urls)
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

  const urls = collectStoryAssetUrls(result.story, result.scenes)
  const urlSummary = await deleteBlobUrls(urls)
  const prefixSummary = await deletePrefixSweep(storyAssetPrefixes(storyId))
  const summary: DeleteAssetsResult = {
    deleted: urlSummary.deleted + prefixSummary.deleted,
    failed: urlSummary.failed + prefixSummary.failed,
  }

  if (summary.failed > 0) {
    return { ok: false, error: 'Failed to delete some blob assets', summary }
  }

  const deleted = await deleteStoryForUser(storyId, userId)
  if (!deleted) {
    return { ok: false, error: 'Not found', summary }
  }

  return { ok: true, summary }
}
