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

export interface Scene {
  id: string
  sentence: string
  voiceover: string
  action: string
  setting: string
  emotion: Emotion
  characters: 1 | 2 | 3
  props: string[]
  svgScene: string // raw SVG string from Gemini
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
