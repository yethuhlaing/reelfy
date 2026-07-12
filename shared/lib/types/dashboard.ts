export type DashboardStoryStatus = 'draft' | 'generating' | 'ready' | 'rendered' | 'failed'

export interface DashboardStory {
  id: string
  title: string
  tagline: string
  category: string
  status: DashboardStoryStatus
  thumbnailUrl: string | null
  sceneCount: number
  animatedCount: number
  totalVoiceoverSeconds: number
  savedAt: number
  lastUpdated: number
  lofiVideoId?: string | null
}

export interface DashboardMeme {
  id: string
  inputText: string
  previewUrl: string
  variantCount: number
  createdAt: number
}

export interface DashboardBrainrot {
  id: string
  title: string
  inputText: string
  previewUrl: string
  status: string
  createdAt: number
}

export type DashboardGridItem =
  | { kind: 'story'; createdAt: number; story: DashboardStory }
  | { kind: 'meme'; createdAt: number; meme: DashboardMeme }
  | { kind: 'brainrot'; createdAt: number; brainrot: DashboardBrainrot }
