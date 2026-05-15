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
}

export interface Scene extends ScenePlan {
  imageUrl: string | null
}

export interface StoryData {
  title: string
  tagline: string
  scenes: Scene[]
}

export type VoiceTone = 'inspirational' | 'casual' | 'documentary' | 'pitch'
export type SceneDensity = '1' | '2' | '3'
export type StickStyle = 'minimal' | 'expressive' | 'dramatic'

export interface GenerateOptions {
  density: SceneDensity
  style: StickStyle
  tone: VoiceTone
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
  | { type: 'story'; title: string; tagline: string }
  | { type: 'scene-planned'; scene: Scene }
  | { type: 'scene-image'; sceneId: string; imageUrl: string }
  | { type: 'scene-image-error'; sceneId: string; error: string }
  | { type: 'image-progress'; done: number; total: number }
  | { type: 'error'; error: string }
  | { type: 'complete' }
