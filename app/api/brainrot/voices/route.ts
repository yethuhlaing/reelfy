import { NextResponse } from 'next/server'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { env } from '@/shared/lib/env'
import {
  brainrotVoiceOrder,
  brainrotVoiceOverride,
  isCuratedBrainrotVoice,
} from '@/shared/data/brainrot-voices'

export interface BrainrotVoice {
  voice_id: string
  name: string
  preview_url: string
  hint: string
  labels: Record<string, string>
}

interface ElevenLabsVoice {
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

// Curated brainrot voice list — the full account roster filtered to the
// hand-picked allowlist in shared/data/brainrot-voices.ts, in allowlist order.
export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  try {
    const voices = await fetchVoices()
    const curated: BrainrotVoice[] = voices
      .filter((v) => isCuratedBrainrotVoice(v.voice_id))
      .map((v) => {
        const override = brainrotVoiceOverride(v.voice_id)
        return {
          voice_id: v.voice_id,
          name: override?.label ?? v.name,
          preview_url: v.preview_url,
          hint: override?.hint ?? '',
          labels: v.labels ?? {},
        }
      })
      .sort((a, b) => brainrotVoiceOrder(a.voice_id) - brainrotVoiceOrder(b.voice_id))

    return NextResponse.json({ voices: curated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch voices' },
      { status: 500 },
    )
  }
}
