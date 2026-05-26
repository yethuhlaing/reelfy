import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { updateSceneForUser } from '@/features/stories/server/stories-db'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; sceneId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id: storyId, sceneId } = await ctx.params
  if (!storyId || !sceneId) {
    return Response.json({ error: 'Missing ids' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    imageUrl?: string | null
    voiceoverUrl?: string | null
    videoUrl?: string | null
    voiceoverDuration?: number | null
    imagePrompt?: string
    motionPrompt?: string | null
    voiceover?: string
  }

  const dbPatch: {
    imageUrl?: string | null
    voiceoverUrl?: string | null
    videoUrl?: string | null
    voiceoverDuration?: number | null
    imagePrompt?: string
    motionPrompt?: string | null
    voiceoverText?: string
  } = {}
  if ('imageUrl' in body) dbPatch.imageUrl = body.imageUrl ?? null
  if ('voiceoverUrl' in body) dbPatch.voiceoverUrl = body.voiceoverUrl ?? null
  if ('videoUrl' in body) dbPatch.videoUrl = body.videoUrl ?? null
  if ('voiceoverDuration' in body) dbPatch.voiceoverDuration = body.voiceoverDuration ?? null
  if ('imagePrompt' in body) dbPatch.imagePrompt = body.imagePrompt ?? ''
  if ('motionPrompt' in body) dbPatch.motionPrompt = body.motionPrompt ?? null
  if ('voiceover' in body) dbPatch.voiceoverText = body.voiceover ?? ''

  if (Object.keys(dbPatch).length === 0) {
    return Response.json({ ok: true })
  }

  const ok = await updateSceneForUser(storyId, sceneId, session.user.id, dbPatch)
  if (!ok) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ ok: true })
}
