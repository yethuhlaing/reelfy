// Curated allowlist of ElevenLabs voice_ids surfaced in the brainrot Voice step.
// These are hand-picked for punchy, viral short-form narration — NOT the full
// account roster. The brainrot voices endpoint filters /v1/voices to this set
// (and preserves this order). Swap in your own account's voice_ids below; the
// `label`/`hint` are UI-only overrides (fallback to ElevenLabs' name when blank).

export type CuratedBrainrotVoice = {
  voiceId: string
  label?: string
  hint?: string
}

export const BRAINROT_VOICES: CuratedBrainrotVoice[] = [
  {
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam — energetic social-media creator
    label: 'Hype Creator',
    hint: 'Energetic, fast, viral',
  },
  {
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam — dominant, firm
    label: 'Deep Narrator',
    hint: 'Confident, documentary energy',
  },
  {
    voiceId: 'nPczCjzI2devNBz1zQrb', // Brian — deep, resonant, comforting
    label: 'Smooth Deep',
    hint: 'Deep, resonant, easy to follow',
  },
  {
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie — deep, confident, energetic
    label: 'Bold Hype',
    hint: 'Punchy and confident',
  },
  {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George — warm, captivating storyteller
    label: 'Storyteller',
    hint: 'Warm, captivating narration',
  },
  {
    voiceId: 'FGY2WhTYpPnrIDTdsKH5', // Laura — enthusiast, quirky
    label: 'Bright & Quirky',
    hint: 'Upbeat female energy',
  },
]

const ALLOWED = new Set(BRAINROT_VOICES.map((v) => v.voiceId))
const ORDER = new Map(BRAINROT_VOICES.map((v, i) => [v.voiceId, i]))
const OVERRIDES = new Map(BRAINROT_VOICES.map((v) => [v.voiceId, v]))

export function isCuratedBrainrotVoice(voiceId: string): boolean {
  return ALLOWED.has(voiceId)
}

export function brainrotVoiceOrder(voiceId: string): number {
  return ORDER.get(voiceId) ?? Number.MAX_SAFE_INTEGER
}

export function brainrotVoiceOverride(voiceId: string): CuratedBrainrotVoice | undefined {
  return OVERRIDES.get(voiceId)
}
