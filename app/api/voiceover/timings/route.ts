import { NextResponse } from 'next/server'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser, parseOptions, updateSceneForUser } from '@/features/stories/server/stories-db'
import { generateVoiceover } from '@/shared/lib/integrations/elevenlabs'

// Lazy backfill: fetches word timings for scenes that predate the /with-timestamps migration.
// To disable backfill entirely, comment out the POST handler body and return early:
// export async function POST() { return NextResponse.json({ wordTimings: null }) }

export async function POST(request: Request) {
  try {
    const session = await requireUserSession(request)
    if (isAuthError(session)) return session
    const userId = session.user.id

    const body = await request.json()
    const { text, sceneId, storyId } = body as {
      text: string
      sceneId: string
      storyId: string
    }

    if (!text || !sceneId || !storyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const story = await getStoryForUser(storyId, userId)
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const storyVoiceId = parseOptions(story.story.options)?.voiceId

    // Calls ElevenLabs /with-timestamps — audio is discarded, only timings stored.
    // One-time credit cost per old scene.
    const { wordTimings } = await generateVoiceover(text, request.signal, {
      userId,
      storyId,
      sceneId,
      operation: 'voiceover_timings_backfill',
    }, storyVoiceId)

    if (request.signal.aborted) {
      return new Response('cancelled', { status: 499 })
    }

    await updateSceneForUser(storyId, sceneId, userId, { voiceoverWordTimings: wordTimings })

    return NextResponse.json({ wordTimings })
  } catch (error) {
    if (
      request.signal.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return new Response('cancelled', { status: 499 })
    }
    console.error('Voiceover timings backfill error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch timings' },
      { status: 500 },
    )
  }
}
