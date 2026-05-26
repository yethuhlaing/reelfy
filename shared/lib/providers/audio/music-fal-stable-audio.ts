import { MUSIC_PRICING } from '@/features/lofi/lib/pricing-constants'
import { createFalMusicProvider } from './music-fal-shared'

const pricing = MUSIC_PRICING['stable-audio']

export const stableAudioProvider = createFalMusicProvider({
  key: 'stable-audio',
  label: 'Stable Audio',
  falModel: 'fal-ai/stable-audio',
  maxDurationSec: 47,
  defaultDurationSec: 45,
  creditsPerLoop: pricing.creditsPerLoop,
  costPerLoopUsd: pricing.costPerLoopUsd,
  buildInput: ({ prompt, durationSec }) => ({
    prompt,
    seconds_total: durationSec,
  }),
})
