export interface ImageOpts {
  aspectRatio: '16:9'
  resolution?: '1024x576' | '1280x720' | '1920x1080'
}

export interface ImageProvider {
  id: string
  costEstimateUsd: number
  generate(prompt: string, opts: ImageOpts): Promise<{ mimeType: string; data: Buffer }>
}

import { fluxSchnellFal } from './image-fal-flux-schnell'
import { fluxDevFal } from './image-fal-flux-dev'
import { sdxlLightningFal } from './image-fal-sdxl-lightning'
import { nanoBananaGemini } from './image-nano-banana'

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  'flux-schnell-fal': fluxSchnellFal,
  'flux-dev-fal': fluxDevFal,
  'sdxl-lightning-fal': sdxlLightningFal,
  'nano-banana': nanoBananaGemini,
}

export function getImageProvider(id?: string): ImageProvider {
  const key = id ?? process.env.IMAGE_MODEL ?? 'flux-schnell-fal'
  if (!IMAGE_PROVIDERS[key]) {
    console.warn(`Unknown IMAGE_MODEL "${key}", falling back to flux-schnell-fal`)
  }
  return IMAGE_PROVIDERS[key] ?? IMAGE_PROVIDERS['flux-schnell-fal']
}