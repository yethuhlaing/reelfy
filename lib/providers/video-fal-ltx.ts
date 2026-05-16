import { fal } from './fal'
import type { VideoProvider, VideoOpts } from './video'

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
  costEstimateUsd: 0.02,
  async generate(imageUrl, prompt, opts) {
    const result = await fal.subscribe(MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: buildInput(imageUrl, prompt, opts) as any,
      logs: false,
    })
    return (result.data as { video: { url: string } }).video.url
  },
  async enqueue(imageUrl, prompt, opts, webhookUrl) {
    const submitted = await fal.queue.submit(MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: buildInput(imageUrl, prompt, opts) as any,
      webhookUrl,
    })
    return { requestId: submitted.request_id }
  },
}
