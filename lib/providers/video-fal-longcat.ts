import { fal } from './fal'
import type { VideoProvider, VideoOpts } from './video'

export const longcatFal: VideoProvider = {
  id: 'longcat-fal',
  costEstimateUsd: 0.03,
  async generate(imageUrl: string, prompt: string, opts: VideoOpts) {
    const result = await fal.subscribe('fal-ai/longcat-video/image-to-video', {
      input: {
        image_url: imageUrl,
        prompt,
        num_frames: opts.numFrames ?? 121,
        fps: opts.fps ?? 24,
        width: opts.width ?? 1280,
        height: opts.height ?? 720,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logs: false,
    })
    return (result.data as { video: { url: string } }).video.url
  },
}
