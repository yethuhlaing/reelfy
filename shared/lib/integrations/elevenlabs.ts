import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import { DEFAULT_ELEVENLABS_VOICE_ID, env } from '@/shared/lib/env'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

export async function generateVoiceover(
  text: string,
  signal?: AbortSignal,
  costContext?: ApiCostContext,
  selectedVoiceId?: string,
): Promise<ArrayBuffer> {
  const voiceId = selectedVoiceId ?? env.ELEVENLABS_VOICE_ID ?? DEFAULT_ELEVENLABS_VOICE_ID

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5', // Fast, cheap nano model
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

  const audio = await response.arrayBuffer()
  if (audio.byteLength === 0) {
    throw new Error('ElevenLabs API returned empty audio buffer')
  }
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
  return audio
}
