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
      // Multi-scene plans (imagePrompt 90-160 words + 9 other fields per scene) blow past
      // 8k for long stories. Free models here have 128k-262k context, so give plenty of room.
      max_tokens: 16384,
    }),
    signal,
  })
  if (!res.ok) {
    const err = await res.text()
    // 404 = model id no longer served; 429 = free-tier rate limit. Surface clearly.
    throw new Error(`OpenRouter API error (${res.status}) for ${modelId}: ${err}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[]
    error?: { message?: string; code?: number }
    usage?: { total_tokens?: number }
  }
  // OpenRouter can return HTTP 200 with an error body (model down, no endpoint, etc.).
  if (data.error) {
    throw new Error(`OpenRouter API error for ${modelId}: ${data.error.message ?? 'unknown error'}`)
  }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(`OpenRouter returned no content for ${modelId}`)
  }
  // Truncated at the token cap → JSON is incomplete. Fail with a clear message instead of
  // handing a half-written array to JSON.parse (which throws a cryptic position error).
  if (data.choices?.[0]?.finish_reason === 'length') {
    throw new Error(
      `Model ${modelId} hit the output length limit before finishing the plan. Try a shorter story or fewer scenes.`,
    )
  }
  return {
    content,
    totalTokens: data.usage?.total_tokens ?? 0,
  }
}

/**
 * Extract the first balanced top-level JSON object from a string, ignoring braces
 * inside string literals. Returns null if no complete object is found (e.g. truncated).
 */
function extractBalancedObject(s: string): string | null {
  const start = s.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inStr = false
  let escaped = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null // never closed → truncated / malformed
}

/** Parse JSON that free models sometimes wrap in fences or prefix with reasoning. */
function parsePlan(content: string): PlanResult {
  const stripped = stripFences(content)
  try {
    return JSON.parse(stripped) as PlanResult
  } catch {
    // Some models emit prose/reasoning before the JSON, or trailing text after it.
    // Extract the first *balanced* object rather than slicing to the last "}" — which
    // corrupts already-truncated output and hides the real cause.
    const obj = extractBalancedObject(stripped)
    if (obj) {
      return JSON.parse(obj) as PlanResult
    }
    throw new Error(
      'Model returned incomplete or invalid JSON for the story plan (likely truncated). Try a shorter story or a different model.',
    )
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
      return parsePlan(content)
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

export const orLlama70b = makeOpenRouterProvider(
  'openrouter/meta-llama/llama-3.3-70b-instruct:free',
  'Llama 3.3 70B — free (OpenRouter)',
)
export const orQwen3Next = makeOpenRouterProvider(
  'openrouter/qwen/qwen3-next-80b-a3b-instruct:free',
  'Qwen3 Next 80B — free (OpenRouter)',
)
export const orGptOss20b = makeOpenRouterProvider(
  'openrouter/openai/gpt-oss-20b:free',
  'GPT-OSS 20B — free (OpenRouter)',
)
export const orGemma4 = makeOpenRouterProvider(
  'openrouter/google/gemma-4-31b-it:free',
  'Gemma 4 31B — free (OpenRouter)',
)
export const orGemma4Small = makeOpenRouterProvider(
  'openrouter/google/gemma-4-26b-a4b-it:free',
  'Gemma 4 26B — free (OpenRouter)',
)
export const orNemotron3Ultra = makeOpenRouterProvider(
  'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free',
  'Nemotron 3 Ultra 550B — free (OpenRouter)',
)
