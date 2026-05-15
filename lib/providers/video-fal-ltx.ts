import { fal } from './fal'
import type { VideoProvider, VideoOpts } from './video'

export const ltxVideoFal: VideoProvider = {
  id: 'ltx-video-fal',
  costEstimateUsd: 0.02,
  async generate(imageUrl: string, prompt: string, opts: VideoOpts) {
    const result = await fal.subscribe('fal-ai/ltx-video/image-to-video', {
      input: {
        image_url: imageUrl,
        prompt,
        num_frames: opts.numFrames ?? 121,
        fps: opts.fps ?? 24,
        width: opts.width ?? 1280,
        height: opts.height ?? 720,
        num_inference_steps: 30,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logs: false,
    })
    return (result.data as { video: { url: string } }).video.url
  },
}
