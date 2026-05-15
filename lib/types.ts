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
export type SceneDensity = '1' | '2' | '3'
export type StickStyle = 'minimal' | 'expressive' | 'dramatic'
export type ImageModel = 'flux-schnell-fal' | 'flux-dev-fal' | 'sdxl-lightning-fal'
export type VideoModel = 'ltx-video-fal' | 'longcat-fal' | 'kling-fal'

export interface GenerateOptions {
  density: SceneDensity
  style: StickStyle
  tone: VoiceTone
  imageModel: ImageModel
  videoModel: VideoModel
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
  | { type: 'complete' }
