import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  assetProgressFromRows,
  hydrateLofiVideo,
} from '@/features/lofi/server/lofi-run'
import { getLofiVideoForUser } from '@/features/lofi/server/lofi-db'
import { deleteStoryWithAssets } from '@/features/stories/server/story-assets'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * The video, its assets, and its current Run.
 *
 * This reconciles against fal before answering, so a missed asset or render
 * webhook is healed by whoever loads the page next — the wait belongs to the
 * video URL, not to the tab that started it.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const hydrated = await hydrateLofiVideo(session.user.id, videoId)
  if (!hydrated) return new Response('Not found', { status: 404 })

  const { video, assets, run } = hydrated

  return Response.json({
    id: video.id,
    storyId: video.storyId,
    status: video.status,
    vibe: video.vibe,
    targetDurationSec: video.targetDurationSec,
    musicModel: video.musicModel,
    musicLoopCount: video.musicLoopCount,
    visualMode: video.visualMode,
    imageModel: video.imageModel,
    videoModel: video.videoModel,
    ambientBed: video.ambientBed,
    arrangementJson: video.arrangementJson,
    finalVideoUrl: video.finalVideoUrl,
    finalDurationSec: video.finalDurationSec,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    assets: assets.map((a) => ({
      id: a.id,
      kind: a.kind,
      orderIndex: a.orderIndex,
      prompt: a.prompt,
      model: a.model,
      durationSec: a.durationSec,
      status: a.status,
      resultUrl: a.resultUrl,
      sourceTrackId: a.sourceTrackId,
    })),
    progress: assetProgressFromRows(assets),
    run,
  })
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const video = await getLofiVideoForUser(videoId, session.user.id)
  if (!video) return new Response('Not found', { status: 404 })

  const result = await deleteStoryWithAssets(video.storyId, session.user.id)
  if (!result.ok) {
    const status = result.error === 'Not found' ? 404 : 500
    return Response.json({ error: result.error, ...result.summary }, { status })
  }

  return Response.json({ ok: true, ...result.summary })
}
