import { fal } from '../fal'
import type { VideoProvider, VideoOpts } from './video'
import { logApiCost } from '@/shared/lib/db/cost-logger'

const MODEL_ID = 'fal-ai/ltx-video/image-to-video'

function buildInput(imageUrl: string, prompt: string, opts: VideoOpts) {
  return {
    image_url: imageUrl,
    prompt,
    num_frames: opts.numFrames ?? 121,
    fps: opts.fps ?? 24,
    width: opts.width ?? 1280,
    height: opts.height ?? 720,
    num_inference_steps: 30,
  }
}

export const ltxVideoFal: VideoProvider = {
  id: 'ltx-video-fal',
  falModel: MODEL_ID,
  costEstimateUsd: 0.1,
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
      model: 'ltx-video',
      operation: costContext?.operation ?? 'video_generation',
      costUsd: 0.1,
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
      model: 'ltx-video',
      operation: costContext?.operation ?? 'video_generation_enqueue',
      costUsd: 0.1,
      creditsCharged: costContext?.creditsCharged ?? 0,
    })
    return { requestId: submitted.request_id }
  },
}
