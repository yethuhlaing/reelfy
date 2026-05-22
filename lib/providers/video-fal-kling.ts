import { fal } from './fal'
import type { VideoProvider, VideoOpts } from './video'
import { logApiCost } from '@/lib/db/cost-logger'

const MODEL_ID = 'fal-ai/kling-video/v2.6/pro/image-to-video'

function buildInput(imageUrl: string, prompt: string, _opts: VideoOpts) {
  void _opts
  return {
    image_url: imageUrl,
    prompt,
    duration: '5',
    aspect_ratio: '16:9',
  }
}

export const klingFal: VideoProvider = {
  id: 'kling-fal',
  falModel: MODEL_ID,
  costEstimateUsd: 0.2,
  async generate(imageUrl, prompt, opts) {
    const { costContext } = opts
    const result = await fal.subscribe(MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: buildInput(imageUrl, prompt, opts) as any,
      logs: false,
    })
    await logApiCost({
      userId: costContext?.userId,
      storyId: costContext?.storyId,
      sceneId: costContext?.sceneId,
      provider: 'fal',
      model: 'kling-video',
      operation: costContext?.operation ?? 'video_generation',
      costUsd: 0.2,
      creditsCharged: costContext?.creditsCharged ?? 0,
    })
    return (result.data as { video: { url: string } }).video.url
  },
  async enqueue(imageUrl, prompt, opts, webhookUrl) {
    const { costContext } = opts
    const submitted = await fal.queue.submit(MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: buildInput(imageUrl, prompt, opts) as any,
      webhookUrl,
    })
    await logApiCost({
      userId: costContext?.userId,
      storyId: costContext?.storyId,
      sceneId: costContext?.sceneId,
      provider: 'fal',
      model: 'kling-video',
      operation: costContext?.operation ?? 'video_generation_enqueue',
      costUsd: 0.2,
      creditsCharged: costContext?.creditsCharged ?? 0,
    })
    return { requestId: submitted.request_id }
  },
}
