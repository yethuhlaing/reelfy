import { requireUserSession, isAuthError } from '@/lib/db/user'
import { duplicateStoryForUser } from '@/lib/db/stories'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const newStoryId = await duplicateStoryForUser(storyId, session.user.id)
  if (!newStoryId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ id: newStoryId })
}
