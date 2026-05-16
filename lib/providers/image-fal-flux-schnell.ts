import { fal, withAbort } from './fal'
import type { ImageProvider, ImageOpts } from './image'

export const fluxSchnellFal: ImageProvider = {
  id: 'flux-schnell-fal',
  costEstimateUsd: 0.003,
  async generate(prompt: string, opts: ImageOpts) {
    const { signal } = opts
    const result = await withAbort(
      fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt,
          image_size: 'landscape_16_9',
          num_inference_steps: 4,
          enable_safety_checker: false,
          num_images: 1,
        },
        logs: false,
      }),
      signal,
    )
    const url = (result.data as { images: { url: string }[] }).images[0].url
    const res = await fetch(url, { signal })
    const buf = Buffer.from(await res.arrayBuffer())
    const mimeType = res.headers.get('content-type') ?? 'image/png'
    return { mimeType, data: buf }
  },
}