import { fal, withAbort } from '@/shared/lib/providers/fal'
import type { ImageProvider, ImageOpts } from './image'
import { logApiCost } from '@/shared/lib/db/cost-logger'

export const sdxlLightningFal: ImageProvider = {
  id: 'sdxl-lightning-fal',
  costEstimateUsd: 0.004,
  async generate(prompt: string, opts: ImageOpts) {
    const { signal, costContext } = opts
    const result = await withAbort(
      fal.subscribe('fal-ai/fast-lightning-sdxl', {
        input: {
          prompt,
          image_size: 'landscape_16_9',
          num_inference_steps: '4',
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
    await logApiCost({
      userId: costContext?.userId,
      storyId: costContext?.storyId,
      sceneId: costContext?.sceneId,
      provider: 'fal',
      model: 'sdxl-lightning',
      operation: costContext?.operation ?? 'image_generation',
      costUsd: 0.004,
      creditsCharged: costContext?.creditsCharged ?? 0,
    })
    return { mimeType, data: buf }
  },
}