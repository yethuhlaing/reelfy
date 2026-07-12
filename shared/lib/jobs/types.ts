export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type JobType = 'animate' | 'compose' | 'export' | 'brainrot-export'

export interface Job<P = unknown, R = unknown> {
  id: string
  type: JobType
  status: JobStatus
  payload: P
  result?: R
  error?: string
  providerRequestId?: string
  providerEndpoint?: string
  createdAt: number
  updatedAt: number
}

export interface AnimatePayload {
  storyId: string
  sceneId: string
  imageUrl: string
  motionPrompt: string
  videoModel?: string
  userId: string
}

export interface AnimateResult {
  videoUrl: string
}

export interface ComposeTrackInput {
  sceneId: string
  videoUrl: string
  voiceoverUrl: string
  duration: number
}

export interface ComposePayload {
  storyId: string
  tracks: ComposeTrackInput[]
  userId: string
}

export interface ComposeResult {
  videoUrl: string
}

export interface ExportSceneInput {
  sceneId: string
  visualUrl: string
  isAnimated: boolean
  voiceoverUrl: string
  duration: number
}

export interface ExportPayload {
  storyId: string
  scenes: ExportSceneInput[]
  resolution: '720p' | '1080p'
  userId: string
}

export interface ExportResult {
  videoUrl: string
}

export interface BrainrotExportPayload {
  projectId: string
  userId: string
  captionPosition: 'top' | 'middle' | 'bottom'
  phase: 'compose' | 'subtitle'
  composedVideoUrl?: string
}

export interface BrainrotExportResult {
  videoUrl: string
}
