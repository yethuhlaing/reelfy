import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getLofiVideoForUser, getLofiAssetsForVideo } from '@/features/lofi/server/lofi-db'

export const runtime = 'nodejs'

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
    assets: assets.map(a => ({
      id: a.id,
      kind: a.kind,
      orderIndex: a.orderIndex,
      prompt: a.prompt,
      model: a.model,
      durationSec: a.durationSec,
      status: a.status,
      resultUrl: a.resultUrl,
    })),
  })
}
