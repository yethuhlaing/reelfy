import { fal, withAbort } from '@/shared/lib/providers/fal'
import type { ImageProvider, ImageOpts } from './image'
import { logApiCost } from '@/shared/lib/db/cost-logger'

const MODEL_ID = 'fal-ai/flux/dev'

function buildInput(prompt: string): Record<string, unknown> {
  return {
    prompt,
    image_size: 'landscape_16_9',
    num_inference_steps: 28,
    enable_safety_checker: false,
    num_images: 1,
  }
}

export const fluxDevFal: ImageProvider = {
  id: 'flux-dev-fal',
  falModel: MODEL_ID,
  costEstimateUsd: 0.025,
  queueInput(prompt: string) {
    return buildInput(prompt)
  },
  async generate(prompt: string, opts: ImageOpts) {
    const { signal, costContext } = opts
    const result = await withAbort(
      fal.subscribe(MODEL_ID, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: buildInput(prompt) as any,
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
      model: 'flux-dev',
      operation: costContext?.operation ?? 'image_generation',
      costUsd: 0.025,
      creditsCharged: costContext?.creditsCharged ?? 0,
    })
    return { mimeType, data: buf }
  },
}
