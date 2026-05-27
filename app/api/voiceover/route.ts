import { NextResponse } from 'next/server'
import { generateVoiceover } from '@/shared/lib/integrations/elevenlabs'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser, parseOptions } from '@/features/stories/server/stories-db'
import { completeSceneVoiceover } from '@/features/stories/server/story-assets'
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
      return NextResponse.json(
        { error: 'Missing required fields: text, sceneId, storyId' },
        { status: 400 },
      )
    }

    const story = await getStoryForUser(storyId, userId)
    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const storyVoiceId = parseOptions(story.story.options)?.voiceId

    const audioBuffer = await generateVoiceover(text, request.signal, {
      userId,
      storyId,
      sceneId,
      operation: 'scene_voiceover',
    }, storyVoiceId)
    if (request.signal.aborted) {
      return new Response('cancelled', { status: 499 })
    }

    const url = await completeSceneVoiceover({
      storyId,
      sceneId,
      userId,
      data: Buffer.from(audioBuffer),
    })

    return NextResponse.json({ url, sceneId })
  } catch (error) {
    if (
      request.signal.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return new Response('cancelled', { status: 499 })
    }
    console.error('Voiceover API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voiceover' },
      { status: 500 },
    )
  }
}
