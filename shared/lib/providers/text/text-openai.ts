import type { VoiceTone, SceneDensity, StickStyle, Format, TextModel } from '@/shared/lib/types'
import type { TextProvider, PlanResult } from './text'
import { stickmanPlanSystemPrompt, stickmanPlanRequest } from '@/shared/lib/prompts/stickman-plan'
import { chatJson, stripFences } from '@/shared/lib/providers/openai/client'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'

/** USD per 1K tokens {input, output} per OpenAI model. Update if pricing shifts. */
const PRICING: Record<TextModel, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  'gpt-4.1-mini': { in: 0.0004, out: 0.0016 },
  'gpt-4o': { in: 0.0025, out: 0.01 },
  'gpt-5': { in: 0.00125, out: 0.01 },
}

async function logCost(
  model: TextModel,
  inputTokens: number,
  outputTokens: number,
  op: string,
  ctx?: ApiCostContext,
): Promise<void> {
  const price = PRICING[model]
  await Promise.all([
    logApiCost({
      userId: ctx?.userId,
      storyId: ctx?.storyId,
      sceneId: ctx?.sceneId,
      provider: 'openai',
      model,
      operation: `${op}_input`,
      costUsd: (inputTokens / 1000) * price.in,
      creditsCharged: ctx?.creditsCharged ?? 0,
    }),
    logApiCost({
      userId: ctx?.userId,
      storyId: ctx?.storyId,
      sceneId: ctx?.sceneId,
      provider: 'openai',
      model,
      operation: `${op}_output`,
      costUsd: (outputTokens / 1000) * price.out,
      creditsCharged: ctx?.creditsCharged ?? 0,
    }),
  ])
}

function makeOpenAIProvider(modelId: TextModel, label: string): TextProvider {
  return {
    id: modelId,
    label,
    async planStory(
      story: string,
      density: SceneDensity,
      style: StickStyle,
      tone: VoiceTone,
      format: Format,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<PlanResult> {
      const system = stickmanPlanSystemPrompt(tone, density, style, format)
      const { content, inputTokens, outputTokens } = await chatJson({
        model: modelId,
        system,
        user: stickmanPlanRequest(system, story),
        maxTokens: 8192,
        signal,
      })
      await logCost(modelId, inputTokens, outputTokens, costContext?.operation ?? 'text_plan', costContext)
      return JSON.parse(stripFences(content)) as PlanResult
    },

    async completeJson(
      prompt: string,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<string> {
      const { content, inputTokens, outputTokens } = await chatJson({
        model: modelId,
        system: 'You are a helpful assistant that returns only valid JSON.',
        user: prompt,
        maxTokens: 4096,
        signal,
      })
      await logCost(modelId, inputTokens, outputTokens, costContext?.operation ?? 'text_complete', costContext)
      return content
    },
  }
}

export const gpt4oMini = makeOpenAIProvider('gpt-4o-mini', 'GPT-4o mini (OpenAI)')
export const gpt41Mini = makeOpenAIProvider('gpt-4.1-mini', 'GPT-4.1 mini (OpenAI)')
export const gpt4o = makeOpenAIProvider('gpt-4o', 'GPT-4o (OpenAI)')
export const gpt5 = makeOpenAIProvider('gpt-5', 'GPT-5 (OpenAI)')
