import { auth } from '@/lib/externals/betterauth'
import { updateSceneForUser } from '@/lib/db/stories'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; sceneId: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: storyId, sceneId } = await ctx.params
  if (!storyId || !sceneId) {
    return Response.json({ error: 'Missing ids' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    imageUrl?: string | null
    voiceoverUrl?: string | null
    videoUrl?: string | null
    voiceoverDuration?: number | null
  }

  const ok = await updateSceneForUser(storyId, sceneId, session.user.id, body)
  if (!ok) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json({ ok: true })
}
