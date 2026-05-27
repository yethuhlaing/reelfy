import { NextResponse } from 'next/server'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { env } from '@/shared/lib/env'

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  preview_url: string
  category: string
  labels: Record<string, string>
}

async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY ?? '' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`ElevenLabs voices error: ${res.status}`)
  const data = (await res.json()) as { voices: ElevenLabsVoice[] }
  return data.voices
}

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  try {
    const voices = await fetchVoices()
    const filtered = voices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      preview_url: v.preview_url,
      category: v.category,
      labels: v.labels,
    }))
    return NextResponse.json({ voices: filtered })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch voices' },
      { status: 500 },
    )
  }
}
