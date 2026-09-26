/**
 * What the brainrot project page and its stream say about the current export
 * Run. Completed Runs are omitted — the page reads `outputVideoUrl` — and
 * aborted is idle.
 */
export type BrainrotExportPhase = 'composing' | 'subtitling'

export type BrainrotExportHydration = {
  runId: string
  status: 'running' | 'failed' | 'aborted'
  /** `null` once the Run is terminal — a terminal Run never renders as loading. */
  phase: BrainrotExportPhase | null
  error?: string
  retryable?: boolean
}
