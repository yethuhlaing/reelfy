import OpenAI from 'openai'
import { env } from '@/shared/lib/env'

/**
 * Shared OpenAI client for all text + embedding work (meme captions, story
 * planning, prompt expansion, retrieval embeddings).
 *
 * Base URL is overridable via OPENAI_BASE_URL so production can point the same
 * OpenAI-compatible calls at OpenRouter (or Azure) by changing one env var —
 * no code changes. Model ids used here are OpenAI ids; if you flip to
 * OpenRouter, prefix them (e.g. `openai/gpt-4o-mini`).
 */
let cached: OpenAI | null = null

export function openai(): OpenAI {
  if (cached) return cached
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  cached = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || undefined,
  })
  return cached
}

/** GPT-5 / reasoning models reject `temperature` and use `max_completion_tokens`. */
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o1|o3|o4)/.test(model)
}

export interface ChatJsonParams {
  model: string
  system: string
  user: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface ChatJsonResult {
  content: string
  inputTokens: number
  outputTokens: number
}

/**
 * Chat completion constrained to a JSON object response. Handles the reasoning-
 * model parameter differences transparently.
 */
export async function chatJson(params: ChatJsonParams): Promise<ChatJsonResult> {
  const { model, system, user, temperature = 0.9, maxTokens = 1024, signal } = params
  const reasoning = isReasoningModel(model)

  const res = await openai().chat.completions.create(
    {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...(reasoning
        ? { max_completion_tokens: maxTokens }
        : { temperature, max_tokens: maxTokens }),
    },
    { signal },
  )

  return {
    content: res.choices[0]?.message?.content ?? '',
    inputTokens: res.usage?.prompt_tokens ?? 0,
    outputTokens: res.usage?.completion_tokens ?? 0,
  }
}

export interface EmbedResult {
  vectors: number[][]
  tokens: number
}

/** Embed one or more inputs. Default model matches the meme schema (1536-dim). */
export async function embed(
  inputs: string[],
  model = 'text-embedding-3-small',
  signal?: AbortSignal,
): Promise<EmbedResult> {
  const res = await openai().embeddings.create({ model, input: inputs }, { signal })
  return {
    vectors: res.data.map((d) => d.embedding),
    tokens: res.usage?.total_tokens ?? 0,
  }
}

/** Strip markdown fences some models wrap around JSON despite json mode. */
export function stripFences(content: string): string {
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenceMatch ? fenceMatch[1] : content
}
