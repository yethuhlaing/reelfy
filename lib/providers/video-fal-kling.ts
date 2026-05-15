import { fal } from './fal'
import type { VideoProvider, VideoOpts } from './video'

export const klingFal: VideoProvider = {
  id: 'kling-fal',
  costEstimateUsd: 0.05,
  async generate(imageUrl: string, prompt: string, _opts: VideoOpts) {
    const result = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
      input: {
        image_url: imageUrl,
        prompt,
        duration: '5',
        aspect_ratio: '16:9',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logs: false,
    })
    return (result.data as { video: { url: string } }).video.url
  },
}
