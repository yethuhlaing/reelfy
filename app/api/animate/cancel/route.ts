import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser } from '@/features/stories/server/stories-db'
import {
  cancelAnimateRun,
  type SceneTarget,
} from '@/features/stories/server/animate-kernel'

export const runtime = 'nodejs'
export const maxDuration = 60

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, sceneId } = body as { storyId?: string; sceneId?: string }
  if (!storyId || !sceneId) {
    return badRequest('Missing required fields: storyId, sceneId')
  }

  const story = await getStoryForUser(storyId, userId)
  if (!story) return badRequest('Story not found')
  if (!story.scenes.some((scene) => scene.id === sceneId)) {
    return badRequest('Scene not found')
  }

  const target: SceneTarget = { kind: 'scene', userId, storyId, sceneId }
  const run = await cancelAnimateRun(target)
  if (!run) return Response.json({ status: 'idle' })
  return Response.json({ runId: run.id, status: run.status })
}
