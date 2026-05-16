import type { VoiceTone, SceneDensity, StickStyle, ScenePlan, TextModel } from '../types'

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
  ): Promise<PlanResult>
}

import { geminiProvider } from './text-gemini'
import { nvidiaNemotronUltra, nvidiaNemotronNano30b, nvidiaNemotronNano9b, nvidiaLlama49b, nvidiaNemotronNano12b, nvidiaLlama70b, nvidiaMixtral8x22b } from './text-nvidia'

export const TEXT_PROVIDERS: Record<TextModel, TextProvider> = {
  'gemini-2.5-flash': geminiProvider,
  'nvidia/nemotron-ultra-253b-v1': nvidiaNemotronUltra,
  'nvidia/nemotron-3-nano-30b-a3b': nvidiaNemotronNano30b,
  'nvidia/nemotron-nano-9b-v2': nvidiaNemotronNano9b,
  'nvidia/llama-3.3-nemotron-super-49b-v1.5': nvidiaLlama49b,
  'nvidia/nemotron-nano-12b-v2': nvidiaNemotronNano12b,
  'nvidia/llama-3.1-nemotron-70b-instruct': nvidiaLlama70b,
  'nvidia/mixtral-8x22b-instruct-v0.1': nvidiaMixtral8x22b,
}

export function getTextProvider(id?: TextModel): TextProvider {
  const key = id ?? 'gemini-2.5-flash'
  return TEXT_PROVIDERS[key] ?? TEXT_PROVIDERS['gemini-2.5-flash']
}
