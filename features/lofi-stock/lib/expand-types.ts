import type { VisualMode } from '@/shared/lib/types'

export interface ExpandResult {
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: string | null
}
