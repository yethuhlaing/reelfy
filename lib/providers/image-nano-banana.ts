import { generateSceneImage } from '@/lib/gemini'
import type { ImageProvider, ImageOpts } from './image'

export const nanoBananaGemini: ImageProvider = {
  id: 'nano-banana',
  costEstimateUsd: 0.04,
  generate: async (prompt: string, _opts: ImageOpts) => {
    return generateSceneImage(prompt)
  },
}