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
}

export interface Scene extends ScenePlan {
  imageUrl: string | null
  voiceoverUrl: string | null
  videoUrl?: string | null
  voiceoverDuration?: number
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
export type StickStyle = 'minimal' | 'expressive' | 'dramatic'
export type ImageModel = 'flux-schnell-fal' | 'flux-dev-fal' | 'sdxl-lightning-fal'
export type VideoModel = 'ltx-video-fal' | 'longcat-fal' | 'kling-fal'
export type VideoQuality = '720p' | '1080p'
export type TextModel =
  | 'gemini-2.5-flash'
  | 'nvidia/nemotron-ultra-253b-v1'
  | 'nvidia/nemotron-3-nano-30b-a3b'
  | 'nvidia/nemotron-nano-9b-v2'
  | 'nvidia/llama-3.3-nemotron-super-49b-v1.5'
  | 'nvidia/nemotron-nano-12b-v2'
  | 'nvidia/llama-3.1-nemotron-70b-instruct'
  | 'nvidia/mixtral-8x22b-instruct-v0.1'

export interface GenerateOptions {
  density: SceneDensity
  style: StickStyle
  tone: VoiceTone
  imageModel: ImageModel
  videoModel: VideoModel
  videoQuality: VideoQuality
  textModel: TextModel
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
  | { type: 'error'; error: string }
  | { type: 'cancelled' }
  | { type: 'complete' }
