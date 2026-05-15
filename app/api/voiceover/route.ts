import { NextResponse } from 'next/server'
import { generateVoiceover } from '@/lib/elevenlabs'

// Simple in-memory cache for audio (resets on server restart - fine for MVP)
const audioCache = new Map<string, ArrayBuffer>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, sceneId } = body as { text: string; sceneId: string }

    if (!text || !sceneId) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sceneId' },
        { status: 400 }
      )
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // Check cache first
    const cached = audioCache.get(sceneId)
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'audio/mpeg' },
      })
    }

    // Generate new audio
    const audioBuffer = await generateVoiceover(text)

    // Cache the result
    audioCache.set(sceneId, audioBuffer)

    return new Response(audioBuffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  } catch (error) {
    console.error('Voiceover API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voiceover' },
      { status: 500 }
    )
  }
}
