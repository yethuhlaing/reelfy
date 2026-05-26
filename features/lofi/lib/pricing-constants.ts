export const RENDER_CREDITS = 5
export const RENDER_COST_USD = 0.5
export const MIN_MUSIC_LOOPS = 10

export const MUSIC_PRICING: Record<string, { creditsPerLoop: number; costPerLoopUsd: number }> = {
  minimax: { creditsPerLoop: 5, costPerLoopUsd: 0.1 },
  'stable-audio': { creditsPerLoop: 2, costPerLoopUsd: 0.05 },
  cassette: { creditsPerLoop: 1, costPerLoopUsd: 0.01 },
}

export const VISUAL_PRICING: Record<string, { credits: number; costUsd: number }> = {
  'flux-schnell-fal': { credits: 1, costUsd: 0.003 },
  'flux-dev-fal': { credits: 5, costUsd: 0.05 },
  'gemini-2.5-flash-image': { credits: 2, costUsd: 0.01 },
  'sdxl-lightning-fal': { credits: 1, costUsd: 0.003 },
  'ltx-video-fal': { credits: 5, costUsd: 0.1 },
  'longcat-fal': { credits: 10, costUsd: 0.2 },
  'kling-fal': { credits: 25, costUsd: 0.5 },
}

const DURATION_MIN_MIN = 5
const DURATION_MAX_MIN = 120
const DURATION_STEP_MIN = 5

function formatDurationLabel(minutes: number): string {
  if (minutes === 60) return '1hr'
  if (minutes === 90) return '1.5hr'
  if (minutes === 120) return '2hr'
  return `${minutes}min`
}

export const DURATION_OPTIONS = Array.from(
  { length: (DURATION_MAX_MIN - DURATION_MIN_MIN) / DURATION_STEP_MIN + 1 },
  (_, i) => {
    const minutes = DURATION_MIN_MIN + i * DURATION_STEP_MIN
    return { value: minutes * 60, label: formatDurationLabel(minutes) }
  },
)

export const ALLOWED_DURATION_SEC = DURATION_OPTIONS.map((d) => d.value)

export const VISUAL_MODE_OPTIONS = [
  { value: 'single-image' as const, label: 'Single Image' },
  { value: 'multi-image' as const, label: 'Multi Image' },
  { value: 'single-video' as const, label: 'Single Video' },
  { value: 'multi-video' as const, label: 'Multi Video' },
]

export const MUSIC_MODEL_OPTIONS = Object.entries(MUSIC_PRICING).map(([key, p]) => ({
  value: key,
  label: `${key} (${p.creditsPerLoop}cr/loop)`,
}))

export const VISUAL_MODEL_OPTIONS = Object.entries(VISUAL_PRICING).map(([key, p]) => ({
  value: key,
  label: `${key.replace(/-/g, ' ')} (${p.credits}cr)`,
}))
