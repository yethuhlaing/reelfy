export const BRAINROT_EXPORT_CREDITS = 3
export const BRAINROT_WRITE_CREDITS = 1
export const BRAINROT_TARGET_WORDS_MIN = 90
export const BRAINROT_TARGET_WORDS_MAX = 120
export const BRAINROT_CHUNK_SEC = 30
export const BRAINROT_WORDS_PER_PHRASE = 4
// Voiceover playback speed for brainrot reels — punchy, high-energy. 1.2 = the
// ElevenLabs max. Brainrot-only; stories use default 1.0.
export const BRAINROT_VOICE_SPEED = 1.2
// Hard cap on manually-entered scripts. Keeps ElevenLabs cost bounded at a flat
// export price. ~300 words ≈ 2min spoken. Rough spoken-duration estimate below.
export const BRAINROT_SCRIPT_MAX_WORDS = 300
export const BRAINROT_SECONDS_PER_WORD = 0.4

export const BRAINROT_FORMAT_OPTIONS = [
  { value: 'facts', label: 'Facts', hint: 'Numbered tips/points' },
  { value: 'narrative', label: 'Story', hint: 'Hook → journey → payoff' },
  { value: 'explainer', label: 'Explainer', hint: 'Teach one concept step by step' },
] as const

export const BRAINROT_CAPTION_POSITION_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
] as const

export const COMPOSE_MODEL_ID = 'fal-ai/ffmpeg-api/compose'
export const SUBTITLE_MODEL_ID = 'fal-ai/workflow-utilities/auto-subtitle'
