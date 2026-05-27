import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import { DEFAULT_ELEVENLABS_VOICE_ID, env } from '@/shared/lib/env'
import type { WordTiming } from '@/shared/lib/types'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

interface ElevenLabsAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

interface ElevenLabsTimestampResponse {
  audio_base64: string
  alignment: ElevenLabsAlignment | null
  normalized_alignment: ElevenLabsAlignment | null
}

function alignmentToWordTimings(alignment: ElevenLabsAlignment | null | undefined): WordTiming[] {
  const chars = alignment?.characters
  if (!chars?.length) {
    throw new Error('ElevenLabs response missing character alignment data')
  }

  const startTimesSec = alignment?.character_start_times_seconds
  const endTimesSec = alignment?.character_end_times_seconds
  const timings: WordTiming[] = []

  let wordStart = 0
  let wordChars = ''

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const isSpace = ch === ' ' || ch === '\n'

    if (isSpace || i === chars.length - 1) {
      if (!isSpace) wordChars += ch
      if (wordChars.trim()) {
        const endIdx = isSpace ? i - 1 : i
        timings.push({
          word: wordChars.trim(),
          startMs: Math.round((startTimesSec[wordStart] ?? 0) * 1000),
          endMs: Math.round((endTimesSec[endIdx] ?? 0) * 1000),
        })
      }
      wordChars = ''
      wordStart = i + 1
    } else {
      if (!wordChars) wordStart = i
      wordChars += ch
    }
  }

  return timings
}

export interface VoiceoverResult {
  audio: ArrayBuffer
  wordTimings: WordTiming[]
}

export async function generateVoiceover(
  text: string,
  signal?: AbortSignal,
  costContext?: ApiCostContext,
  selectedVoiceId?: string,
): Promise<VoiceoverResult> {
  const voiceId = selectedVoiceId ?? env.ELEVENLABS_VOICE_ID ?? DEFAULT_ELEVENLABS_VOICE_ID

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
        style: 0.3,
      },
    }),
    signal,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
  }

  const json = (await response.json()) as ElevenLabsTimestampResponse

  const binaryStr = atob(json.audio_base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  const audio = bytes.buffer

  if (audio.byteLength === 0) {
    throw new Error('ElevenLabs API returned empty audio buffer')
  }

  const wordTimings = alignmentToWordTimings(json.normalized_alignment ?? json.alignment)

  await logApiCost({
    userId: costContext?.userId,
    storyId: costContext?.storyId,
    sceneId: costContext?.sceneId,
    provider: 'elevenlabs',
    model: 'eleven_flash_v2_5',
    operation: costContext?.operation ?? 'voiceover_tts',
    costUsd: text.length * 0.0003,
    creditsCharged: costContext?.creditsCharged ?? 0,
  })

  return { audio, wordTimings }
}
