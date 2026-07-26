import { animatedExplainer } from './animated-explainer'
import { cinematic } from './cinematic'
import type { Pipeline } from './types'

const ALL = [cinematic, animatedExplainer] as const

export const PIPELINES: Record<string, Pipeline> = Object.fromEntries(
  ALL.map((p) => [p.id, p]),
)

export const DEFAULT_PIPELINE_ID = cinematic.id

export function getPipeline(id: string): Pipeline | undefined {
  return PIPELINES[id]
}

export function pipelineCatalog() {
  return ALL.map((p) => ({ id: p.id, label: p.label, description: p.description }))
}
