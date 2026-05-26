import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getLofiVideoForUser, getLofiAssetsForVideo } from '@/features/lofi/server/lofi-db'
import { deleteStoryWithAssets } from '@/features/stories/server/story-assets'

export const runtime = 'nodejs'

function computeAssetProgress(assets: { kind: string; status: string }[]) {
  const music = assets.filter((a) => a.kind === 'music' || a.kind === 'stock-music')
  const visual = assets.filter((a) => a.kind === 'visual')
  const musicReady = music.filter((a) => a.status === 'ready').length
  const visualReady = visual.filter((a) => a.status === 'ready').length
  const total = music.length + visual.length
  const ready = musicReady + visualReady
  return {
    musicReady,
    musicTotal: music.length,
    visualReady,
    visualTotal: visual.length,
    overallPct: total > 0 ? Math.round((ready / total) * 100) : 0,
  }
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const video = await getLofiVideoForUser(videoId, userId)
  if (!video) return new Response('Not found', { status: 404 })

  const assets = await getLofiAssetsForVideo(videoId)

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
    })),
    progress: computeAssetProgress(assets),
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
