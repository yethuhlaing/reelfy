import { MUSIC_PRICING } from '@/features/lofi/lib/pricing-constants'
import { createFalMusicProvider } from './music-fal-shared'

const pricing = MUSIC_PRICING.minimax

export const minimaxProvider = createFalMusicProvider({
  key: 'minimax',
  label: 'MiniMax Music',
  falModel: 'fal-ai/minimax-music/v2.5',
  maxDurationSec: 240,
  defaultDurationSec: 90,
  creditsPerLoop: pricing.creditsPerLoop,
  costPerLoopUsd: pricing.costPerLoopUsd,
  buildInput: ({ prompt }) => ({
    prompt,
    is_instrumental: true,
  }),
})
