export type RunStage = 'route' | 'plan' | 'gate' | 'assets' | 'compose' | 'done' | 'failed'
export type RunStatus = 'running' | 'awaiting_approval' | 'ok' | 'failed' | 'cancelled'

export type DecisionLogEntry = {
  category: string
  subject: string
  choice: string
  optionsConsidered?: string[]
  rejectedBecause?: string
  costCredits?: number
  at: string
  revised?: boolean
}
