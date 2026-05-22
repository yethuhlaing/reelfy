import type { ApiCostContext } from '@/lib/db/cost-logger'

export interface VideoOpts {
  numFrames?: number
  fps?: number
  width?: number
  height?: number
  costContext?: ApiCostContext
}

export interface VideoProvider {
  id: string
  falModel: string
  costEstimateUsd: number
  generate(imageUrl: string, prompt: string, opts: VideoOpts): Promise<string>
  enqueue(
    imageUrl: string,
    prompt: string,
    opts: VideoOpts,
    webhookUrl: string,
  ): Promise<{ requestId: string }>
}

import { ltxVideoFal } from './video-fal-ltx'
import { longcatFal } from './video-fal-longcat'
import { klingFal } from './video-fal-kling'

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  'ltx-video-fal': ltxVideoFal,
  'longcat-fal': longcatFal,
  'kling-fal': klingFal,
}

export function getVideoProvider(id?: string): VideoProvider {
  const key = id ?? 'ltx-video-fal'
  if (!VIDEO_PROVIDERS[key]) {
    console.warn(`Unknown VIDEO_MODEL "${key}", falling back to ltx-video-fal`)
  }
  return VIDEO_PROVIDERS[key] ?? VIDEO_PROVIDERS['ltx-video-fal']
}
