import { fal } from './fal'
import type { ImageProvider, ImageOpts } from './image'

export const fluxDevFal: ImageProvider = {
  id: 'flux-dev-fal',
  costEstimateUsd: 0.04,
  async generate(prompt: string, _opts: ImageOpts) {
    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt,
        image_size: 'landscape_16_9',
        num_inference_steps: 28,
        enable_safety_checker: false,
        num_images: 1,
      },
      logs: false,
    })
    const url = (result.data as { images: { url: string }[] }).images[0].url
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    const mimeType = res.headers.get('content-type') ?? 'image/png'
    return { mimeType, data: buf }
  },
}