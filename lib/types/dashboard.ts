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
}
