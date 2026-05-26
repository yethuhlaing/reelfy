import { MUSIC_PRICING } from '@/features/lofi/lib/pricing-constants'
import { createFalMusicProvider } from './music-fal-shared'

const pricing = MUSIC_PRICING.cassette

export const cassetteProvider = createFalMusicProvider({
  key: 'cassette',
  label: 'CassetteAI',
  falModel: 'fal-ai/cassetteai/music-generator',
  maxDurationSec: 180,
  defaultDurationSec: 120,
  creditsPerLoop: pricing.creditsPerLoop,
  costPerLoopUsd: pricing.costPerLoopUsd,
  buildInput: ({ prompt, durationSec }) => ({
    prompt,
    duration: durationSec,
  }),
})
