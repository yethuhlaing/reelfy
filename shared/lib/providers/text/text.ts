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
import {
  orDeepSeekR1,
  orLlama70b,
  orGeminiFlash,
  orQwen72b,
} from './text-openrouter'

export const TEXT_PROVIDERS: Record<TextModel, TextProvider> = {
  'gemini-2.5-flash': geminiProvider,
  'nvidia/nemotron-ultra-253b-v1': nvidiaNemotronUltra,
  'openrouter/deepseek/deepseek-r1:free': orDeepSeekR1,
  'openrouter/meta-llama/llama-3.3-70b-instruct:free': orLlama70b,
  'openrouter/google/gemini-2.0-flash-exp:free': orGeminiFlash,
  'openrouter/qwen/qwen-2.5-72b-instruct:free': orQwen72b,
}

export function getTextProvider(id?: TextModel): TextProvider {
  const key = id ?? 'gemini-2.5-flash'
  return TEXT_PROVIDERS[key] ?? TEXT_PROVIDERS['gemini-2.5-flash']
}
