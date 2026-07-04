import type { VoiceTone, SceneDensity, StickStyle, TextModel } from '@/shared/lib/types'
import type { TextProvider, PlanResult } from './text'
import {
  stickmanPlanSystemPrompt,
  stickmanPlanUserMessage,
} from '@/shared/lib/prompts/stickman-plan'
import type { ApiCostContext } from '@/shared/lib/db/cost-logger'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import { env } from '@/shared/lib/env'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Strip markdown fences some free models wrap around JSON despite json_object mode. */
function stripFences(content: string): string {
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenceMatch ? fenceMatch[1] : content
}

async function callOpenRouter(
  modelId: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
): Promise<{ content: string; totalTokens: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  }
  // OpenRouter attribution headers (optional, improve rate limits).
  if (env.PUBLIC_BASE_URL) headers['HTTP-Referer'] = env.PUBLIC_BASE_URL
  headers['X-Title'] = 'Reelify'

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 8192,
    }),
    signal,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error (${res.status}): ${err}`)
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[]
    usage?: { total_tokens?: number }
  }
  return {
    content: data.choices[0].message.content,
    totalTokens: data.usage?.total_tokens ?? 0,
  }
}

function makeOpenRouterProvider(modelId: TextModel, label: string): TextProvider {
  // Model id sent to OpenRouter (strip local prefix if present).
  const remoteModel = modelId.replace(/^openrouter\//, '')
  return {
    id: modelId,
    label,
    async planStory(
      story: string,
      density: SceneDensity,
      style: StickStyle,
      tone: VoiceTone,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<PlanResult> {
      const systemPrompt = stickmanPlanSystemPrompt(tone, density, style)
      const { content } = await callOpenRouter(
        remoteModel,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: stickmanPlanUserMessage(story) },
        ],
        signal,
      )
      await logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'openrouter',
        model: remoteModel,
        operation: costContext?.operation ?? 'text_plan',
        // Free models cost $0; keep formula ready for paid models later.
        costUsd: 0,
        creditsCharged: costContext?.creditsCharged ?? 0,
      })
      return JSON.parse(stripFences(content))
    },

    async completeJson(
      prompt: string,
      signal?: AbortSignal,
      costContext?: ApiCostContext,
    ): Promise<string> {
      const { content } = await callOpenRouter(
        remoteModel,
        [{ role: 'user', content: prompt }],
        signal,
      )
      await logApiCost({
        userId: costContext?.userId,
        storyId: costContext?.storyId,
        sceneId: costContext?.sceneId,
        provider: 'openrouter',
        model: remoteModel,
        operation: costContext?.operation ?? 'text_complete',
        costUsd: 0,
        creditsCharged: costContext?.creditsCharged ?? 0,
      })
      return content
    },
  }
}

export const orDeepSeekR1 = makeOpenRouterProvider(
  'openrouter/deepseek/deepseek-r1:free',
  'DeepSeek R1 — free (OpenRouter)',
)
export const orLlama70b = makeOpenRouterProvider(
  'openrouter/meta-llama/llama-3.3-70b-instruct:free',
  'Llama 3.3 70B — free (OpenRouter)',
)
export const orGeminiFlash = makeOpenRouterProvider(
  'openrouter/google/gemini-2.0-flash-exp:free',
  'Gemini 2.0 Flash — free (OpenRouter)',
)
export const orQwen72b = makeOpenRouterProvider(
  'openrouter/qwen/qwen-2.5-72b-instruct:free',
  'Qwen 2.5 72B — free (OpenRouter)',
)
