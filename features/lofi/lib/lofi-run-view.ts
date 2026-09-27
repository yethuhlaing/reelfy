/**
 * What the lofi video page and its stream say about the current Run.
 *
 * `gating` is not here: arranging happens in process while the render Step is
 * being built, so there is no state between generating and rendering for a
 * client to sit in.
 */

/** The phase the user is waiting on. One per Step kind lofi uses. */
export type LofiRunPhase = 'generating_assets' | 'rendering'

/** The lofi video's own status column, projected from the Run. */
export type LofiVideoStatus = 'generating' | 'rendering' | 'complete' | 'failed' | 'aborted'

export type LofiRunHydration = {
  runId: string
  status: 'running' | 'failed' | 'aborted'
  /** `null` once the Run is terminal — a terminal Run never renders as loading. */
  phase: LofiRunPhase | null
  error?: string
  /** Whether Retry is on offer at all. */
  retryable: boolean
  /** Why it is not, when it is not. Shown instead of a dead button. */
  retryBlockedReason?: string
}

export function lofiPhaseLabel(phase: LofiRunPhase | null): string {
  if (phase === 'rendering') return 'Rendering video… (this can take 5-15 min)'
  if (phase === 'generating_assets') return 'Generating assets…'
  return 'Working…'
}
