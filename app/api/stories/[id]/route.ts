import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  getStoryForUser,
  parseOptions,
  rowToStoryData,
  updateStoryMeta,
} from '@/features/stories/server/stories-db'
import { deleteStoryWithAssets } from '@/features/stories/server/story-assets'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const result = await getStoryForUser(storyId, session.user.id)
  if (!result) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const { story, scenes: sceneRows } = result
  return Response.json({
    id: story.id,
    category: story.category,
    status: story.status,
    storyInput: story.storyInput,
    options: parseOptions(story.options),
    composedVideoUrl: story.composedVideoUrl,
    savedAt: story.createdAt.getTime(),
    lastUpdated: story.updatedAt.getTime(),
    storyData: rowToStoryData(story, sceneRows),
  })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id: storyId } = await ctx.params
  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    thumbnailUrl?: string | null
    composedVideoUrl?: string | null
    status?: string
  }
  const ok = await updateStoryMeta(storyId, session.user.id, body)
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const result = await deleteStoryWithAssets(storyId, session.user.id)
  if (!result.ok) {
    const status = result.error === 'Not found' ? 404 : 500
    return Response.json({ error: result.error, ...result.summary }, { status })
  }

  return Response.json({ ok: true, ...result.summary })
}
