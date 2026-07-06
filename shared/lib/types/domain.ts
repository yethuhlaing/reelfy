export type Emotion =
  | 'frustration'
  | 'hope'
  | 'excitement'
  | 'despair'
  | 'triumph'
  | 'curiosity'
  | 'relief'
  | 'determination'
  | 'neutral'

export interface ScenePlan {
  id: string
  sentence: string
  voiceover: string
  action: string
  setting: string
  emotion: Emotion
  characters: 1 | 2 | 3
  props: string[]
  imagePrompt: string
  motionPrompt?: string
  // Set only for numbered formats (facts, tutorial). itemIndex groups the ~N
  // scenes that belong to one tip/step; itemLabel is the drawn badge ("Tip 3", "Step 2").
  // Null/absent for narrative, explainer, comparison.
  itemIndex?: number | null
  itemLabel?: string | null
}

export interface WordTiming {
  word: string
  startMs: number
  endMs: number
}

export interface Scene extends ScenePlan {
  imageUrl: string | null
  voiceoverUrl: string | null
  videoUrl?: string | null
  voiceoverDuration?: number
  voiceoverWordTimings?: WordTiming[] | null
  pendingJobId?: string
  lastError?: string
}

export interface StoryData {
  title: string
  tagline: string
  protagonist: string
  thumbnailPrompt: string | null
  thumbnailUrl: string | null
  scenes: Scene[]
}

export type VoiceTone = 'inspirational' | 'casual' | 'documentary' | 'pitch'
export type SceneDensity = '8' | '10' | '12' | '16' | '20' | '25' | '30' | '35' | '40' | '45' | '50' | '55' | '60'
export type StickStyle = 'minimal' | 'expressive' | 'dramatic' | 'editorial'
// Content STRUCTURE (orthogonal to StickStyle, which is look). Drives the narrative
// arc, voiceover pattern, scene fan-out, numbering, and emotion guidance in the plan prompt.
export type Format = 'narrative' | 'facts' | 'explainer' | 'tutorial' | 'comparison'
export type ImageModel = 'flux-schnell-fal' | 'flux-dev-fal' | 'sdxl-lightning-fal'
export type VideoModel = 'ltx-video-fal' | 'longcat-fal' | 'kling-fal'
export type VideoQuality = '720p' | '1080p'
export type TextModel =
  | 'gpt-4o-mini'
  | 'gpt-4.1-mini'
  | 'gpt-4o'
  | 'gpt-5'

export interface GenerateOptions {
  density: SceneDensity
  style: StickStyle
  tone: VoiceTone
  format: Format
  imageModel: ImageModel
  videoModel: VideoModel
  videoQuality: VideoQuality
  textModel: TextModel
  voiceId?: string
}

export type StageId =
  | 'analyze'
  | 'plan'
  | 'images'
  | 'done'

export type StageStatus = 'pending' | 'active' | 'done' | 'error'

export interface Stage {
  id: StageId
  label: string
  status: StageStatus
  detail?: string
}

// Lofi types
export type VisualMode = 'single-image' | 'multi-image' | 'single-video' | 'multi-video'

export type VisualAsset = {
  prompt: string
  durationSec: number
}

export type VisualConfig = {
  mode: VisualMode
  model: string
  assets: VisualAsset[]
}

export type LofiVideoStatus = 'planning' | 'generating' | 'gating' | 'rendering' | 'complete' | 'failed' | 'aborted'
export type LofiAssetStatus = 'pending' | 'submitted' | 'ready' | 'failed' | 'skipped'

export type AmbientBed = 'rain' | 'vinyl' | 'fireplace' | 'cafe'

export type StreamEvent =
  | { type: 'stage'; id: StageId; status: StageStatus; detail?: string }
  | { type: 'story'; title: string; tagline: string; protagonist: string }
  | { type: 'scene-planned'; scene: Scene }
  | { type: 'scene-image'; sceneId: string; imageUrl: string }
  | { type: 'scene-image-error'; sceneId: string; error: string }
  | { type: 'image-progress'; done: number; total: number }
  | { type: 'info'; message: string }
  | { type: 'thumbnail-prompt'; prompt: string }
  | { type: 'thumbnail-image'; url: string }
  | { type: 'thumbnail-error'; error: string }
  | { type: 'insufficient_credits'; required: number; balance: number }
  | { type: 'error'; error: string }
  | { type: 'complete' }
