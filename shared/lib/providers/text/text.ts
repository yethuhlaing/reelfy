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
  orLlama70b,
  orQwen3Next,
  orGptOss20b,
  orGemma4,
  orGemma4Small,
  orNemotron3Ultra,
} from './text-openrouter'

export const TEXT_PROVIDERS: Record<TextModel, TextProvider> = {
  'gemini-2.5-flash': geminiProvider,
  'nvidia/nemotron-ultra-253b-v1': nvidiaNemotronUltra,
  'openrouter/meta-llama/llama-3.3-70b-instruct:free': orLlama70b,
  'openrouter/qwen/qwen3-next-80b-a3b-instruct:free': orQwen3Next,
  'openrouter/openai/gpt-oss-20b:free': orGptOss20b,
  'openrouter/google/gemma-4-31b-it:free': orGemma4,
  'openrouter/google/gemma-4-26b-a4b-it:free': orGemma4Small,
  'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free': orNemotron3Ultra,
}

export function getTextProvider(id?: TextModel): TextProvider {
  const key = id ?? 'gemini-2.5-flash'
  return TEXT_PROVIDERS[key] ?? TEXT_PROVIDERS['gemini-2.5-flash']
}
