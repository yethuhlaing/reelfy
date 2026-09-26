import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser } from '@/features/stories/server/stories-db'
import {
  startOrRetryAnimate,
  type SceneTarget,
} from '@/features/stories/server/animate-kernel'
import { InsufficientCreditsError } from '@/shared/lib/video-processing/errors'

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

  try {
    const run = await startOrRetryAnimate(target)
    return Response.json({
      runId: run.id,
      status: run.status,
      error: run.error,
    })
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return Response.json(
        { error: err.message, balance: err.balance, required: err.required },
        { status: 402 },
      )
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Animate start failed', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
