import { MUSIC_PRICING, VISUAL_PRICING } from '@/features/billing/server/credit-catalog'

export { RENDER_CREDITS, RENDER_COST_USD } from '@/features/billing/server/credit-catalog'
export { MUSIC_PRICING, VISUAL_PRICING }

export const MIN_MUSIC_LOOPS = 10

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
