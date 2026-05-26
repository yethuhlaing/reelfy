import type { TextModel, VisualMode, VisualConfig } from '@/shared/lib/types'

export interface ExpandPromptsRequest {
  vibe: string
  targetDurationSec: number
  targetVisualCount?: number
  textModel?: TextModel
}

export interface ExpandPromptsResponse {
  musicPrompts: string[]
  visualPrompts: string[]
  suggestedTitle: string
  suggestedAmbientBed: string | null
}

export async function expandPrompts(body: ExpandPromptsRequest): Promise<ExpandPromptsResponse | null> {
  const res = await fetch('/api/lofi/expand-prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json()
}

export interface GenerateLofiRequest {
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualConfig: VisualConfig
  musicPrompts: string[]
  visualPrompts: string[]
  suggestedTitle: string
  suggestedAmbientBed: string | null
}

export interface GenerateLofiResponse {
  videoId: string
  storyId: string
}

export async function generateLofi(body: GenerateLofiRequest): Promise<GenerateLofiResponse | null> {
  const res = await fetch('/api/lofi/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return res.json()
}

export interface LofiVideoStatusResponse {
  id: string
  storyId: string
  status: string
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualMode: string
  imageModel: string | null
  videoModel: string | null
  ambientBed: string | null
  arrangementJson: string | null
  finalVideoUrl: string | null
  finalDurationSec: number | null
  createdAt: string
  updatedAt: string
  assets: {
    id: string
    kind: string
    orderIndex: number
    prompt: string
    model: string
    durationSec: number
    status: string
    resultUrl: string | null
  }[]
}

export async function getLofiVideoStatus(videoId: string): Promise<LofiVideoStatusResponse | null> {
  const res = await fetch(`/api/lofi/videos/${videoId}`)
  if (!res.ok) return null
  return res.json()
}

export async function cancelLofiVideo(videoId: string): Promise<boolean> {
  const res = await fetch(`/api/lofi/videos/${videoId}/cancel`, { method: 'POST' })
  return res.ok
}

export function validateVisualConfig(config: VisualConfig): string | null {
  const { mode, assets } = config

  if (mode === 'single-image' || mode === 'single-video') {
    if (assets.length !== 1) return `${mode} requires exactly 1 asset`
    return null
  }

  if (mode === 'multi-image' || mode === 'multi-video') {
    if (assets.length < 2 || assets.length > 12) return 'multi-* modes require 2-12 assets'
    const totalDuration = assets.reduce((sum, a) => sum + a.durationSec, 0)
    if (totalDuration < 60) return `visual assets total ${totalDuration}s, need at least 60s`
    return null
  }

  return 'unknown visual mode'
}
