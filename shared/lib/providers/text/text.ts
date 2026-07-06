import type { VoiceTone, SceneDensity, StickStyle, Format, ScenePlan, TextModel } from '@/shared/lib/types'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'

export interface PlanResult {
  title: string
  tagline: string
  protagonist: string
  thumbnailPrompt: string
  scenes: (ScenePlan & { motionPrompt: string })[]
}

export interface TextProvider {
  id: TextModel
  label: string
  planStory(
    story: string,
    density: SceneDensity,
    style: StickStyle,
    tone: VoiceTone,
    format: Format,
    signal?: AbortSignal,
    costContext?: ApiCostContext,
  ): Promise<PlanResult>
  /** Single-shot JSON-oriented completion (e.g. lofi prompt expand). */
  completeJson(
    prompt: string,
    signal?: AbortSignal,
    costContext?: ApiCostContext,
  ): Promise<string>
}

import { gpt4oMini, gpt41Mini, gpt4o, gpt5 } from './text-openai'

export const TEXT_PROVIDERS: Record<TextModel, TextProvider> = {
  'gpt-4o-mini': gpt4oMini,
  'gpt-4.1-mini': gpt41Mini,
  'gpt-4o': gpt4o,
  'gpt-5': gpt5,
}

export function getTextProvider(id?: TextModel): TextProvider {
  const key = id ?? 'gpt-4o-mini'
  return TEXT_PROVIDERS[key] ?? TEXT_PROVIDERS['gpt-4o-mini']
}
