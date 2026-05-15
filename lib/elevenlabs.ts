const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

export async function generateVoiceover(text: string): Promise<ArrayBuffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Default to Adam

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
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
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`)
  }

  return response.arrayBuffer()
}
