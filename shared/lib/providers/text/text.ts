import type { VoiceTone, SceneDensity, StickStyle, ScenePlan, TextModel } from '@/shared/lib/types'
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

import { geminiProvider } from './text-gemini'
import { nvidiaNemotronUltra } from './text-nvidia'
import { groqLlama70b, groqDeepSeekR1 } from './text-groq'

export const TEXT_PROVIDERS: Record<TextModel, TextProvider> = {
  'gemini-2.5-flash': geminiProvider,
  'nvidia/nemotron-ultra-253b-v1': nvidiaNemotronUltra,
  'groq/llama-3.3-70b-versatile': groqLlama70b,
  'groq/deepseek-r1-distill-llama-70b': groqDeepSeekR1,
}

export function getTextProvider(id?: TextModel): TextProvider {
  const key = id ?? 'gemini-2.5-flash'
  return TEXT_PROVIDERS[key] ?? TEXT_PROVIDERS['gemini-2.5-flash']
}
