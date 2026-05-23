import { NextResponse } from 'next/server'
import { generateVoiceover } from '@/lib/externals/elevenlabs'
import { requireUserSession, isAuthError } from '@/lib/db/user'
import { getStoryForUser } from '@/lib/db/stories'
import { completeSceneVoiceover } from '@/lib/story-assets'

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

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured' },
        { status: 500 },
      )
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is not configured' },
        { status: 500 },
      )
    }

    const audioBuffer = await generateVoiceover(text, request.signal, {
      userId,
      storyId,
      sceneId,
      operation: 'scene_voiceover',
    })
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
