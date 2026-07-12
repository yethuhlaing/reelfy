import type { WordTiming } from './domain'

export type BrainrotFormat = 'facts' | 'narrative' | 'explainer'
export type BrainrotCaptionPosition = 'top' | 'middle' | 'bottom'
export type BrainrotStatus = 'draft' | 'script_ready' | 'rendering' | 'complete' | 'failed'

export interface BrainrotProject {
  id: string
  inputText: string
  title: string
  script: string
  format: BrainrotFormat
  backgroundCategory: string
  characterVoiceId: string
  captionPosition: BrainrotCaptionPosition
  voiceoverUrl: string | null
  voiceoverDurationSec: number | null
  voiceoverWordTimings: WordTiming[] | null
  backgroundVideoId: string | null
  chunkStartIndex: number | null
  chunkUrls: string[] | null
  outputVideoUrl: string | null
  status: BrainrotStatus
  renderJobId: string | null
  creditsCharged: number
  createdAt: string
  updatedAt: string
}
