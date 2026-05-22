import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { generateVoiceover } from '@/lib/externals/elevenlabs'
import { auth } from '@/lib/externals/betterauth'

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id

    const body = await request.json()
    const { text, sceneId, storyId } = body as {
      text: string
      sceneId: string
      storyId: string
    }

    if (!text || !sceneId || !storyId) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sceneId, storyId' },
        { status: 400 }
      )
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured' },
        { status: 500 }
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

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const base64 = Buffer.from(audioBuffer).toString('base64')
      const url = `data:audio/mpeg;base64,${base64}`
      return NextResponse.json({ url, sceneId, fallback: 'data-url' })
    }

    const path = `voiceovers/${storyId}/${sceneId}.mp3`
    const { url } = await put(path, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
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
      { status: 500 }
    )
  }
}
