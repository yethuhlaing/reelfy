/**
 * What Story GET returns for the current export Run. Completed and aborted
 * Runs are omitted — the Video tab reads `composedVideoUrl`, and abort is idle.
 */
export type StoryExportHydration = {
  runId: string
  status: 'running' | 'failed' | 'aborted'
  phase: 'composing' | null
  error?: string
  retryable?: boolean
}
