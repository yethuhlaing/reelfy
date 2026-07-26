import type { z } from 'zod'

export type StageId = 'plan' | 'assets' | 'compose'

export type Stage = {
  id: StageId
  systemPrompt: string
  outputSchema?: z.ZodTypeAny
  gate: 'before' | 'none'
  tools: string[]
}

export type Pipeline = {
  id: string
  label: string
  description: string
  storyCategory: string
  stages: Stage[]
  defaults: {
    textModel: string
    imageModel: string
    videoModel?: string
    musicModel?: string
  }
}
