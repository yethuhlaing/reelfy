import { getTextProvider } from '@/shared/lib/providers/text'
import type { TextModel } from '@/shared/lib/types'
import type { VisualMode, AmbientBed } from '@/shared/lib/types'

export interface ExpandPromptsInput {
  vibe: string
  targetDurationSec: number
  textModel: TextModel
}

export interface ExpandPromptsOutput {
  musicPrompts: string[]
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: AmbientBed | null
}

function buildSystemPrompt(input: ExpandPromptsInput): string {
  const musicLoopCount = Math.ceil(input.targetDurationSec / 180)
  return `You generate prompt sets for AI-generated lofi YouTube videos. Given a single vibe phrase, return JSON with:
- musicPrompts: array of exactly ${musicLoopCount} short prompts for instrumental lofi music. Each prompt should describe a slight variation of the same mood (different instrument focus, energy level, tempo subtly different). All should fit together as one cohesive listening session.
- visualMode: choose the best fit from "single-image", "multi-image", "single-video", "multi-video". Use "single-image" for calm static vibes, "multi-image" when the vibe implies multiple scenes or changing settings, "single-video" for subtle motion (rain, steam, flickering), "multi-video" only for very dynamic vibes.
- visualPrompts: array of 1–6 prompts. If visualMode is "single-image" or "single-video", return exactly 1 prompt. For "multi-image"/"multi-video", choose 3–6 prompts that feel like the same world from different angles or moments — cohesive, not jarring.
- suggestedTitle: a short YouTube-style title (≤60 chars).
- suggestedAmbientBed: pick best fit from rain/vinyl/fireplace/cafe based on the vibe, or null if none fit.

Return strict JSON, no markdown.`
}

const VALID_VISUAL_MODES = ['single-image', 'multi-image', 'single-video', 'multi-video']

function validateOutput(data: unknown): data is ExpandPromptsOutput {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (!Array.isArray(d.musicPrompts) || !d.musicPrompts.every((p: unknown) => typeof p === 'string')) return false
  if (!Array.isArray(d.visualPrompts) || !d.visualPrompts.every((p: unknown) => typeof p === 'string')) return false
  if (!VALID_VISUAL_MODES.includes(d.visualMode as string)) return false
  if (typeof d.suggestedTitle !== 'string') return false
  if (d.suggestedAmbientBed !== null && !['rain', 'vinyl', 'fireplace', 'cafe'].includes(d.suggestedAmbientBed as string)) return false
  return true
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) {
    try { return JSON.parse(match[1]) } catch { /* fall through */ }
  }
  try { return JSON.parse(trimmed) } catch { /* fall through */ }
  const braceIdx = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (braceIdx !== -1 && lastBrace !== -1) {
    try { return JSON.parse(trimmed.slice(braceIdx, lastBrace + 1)) } catch { /* fall through */ }
  }
  return null
}

async function callModel(
  input: ExpandPromptsInput,
  retryCount: number,
): Promise<ExpandPromptsOutput | null> {
  const systemPrompt = buildSystemPrompt(input)
  const vibePrompt = `VIBE: "${input.vibe}"\nTARGET DURATION: ${Math.round(input.targetDurationSec / 60)} minutes`
  const instruction = retryCount > 0
    ? `${systemPrompt}\n\n${vibePrompt}\n\nReturn only valid JSON, no prose.`
    : `${systemPrompt}\n\n${vibePrompt}`

  const provider = getTextProvider(input.textModel)
  const text = await provider.completeJson(instruction, undefined, { operation: 'lofi_expand' })
  const parsed = extractJson(text)
  if (!validateOutput(parsed)) return null

  return parsed as ExpandPromptsOutput
}

export async function expandPrompts(input: ExpandPromptsInput): Promise<ExpandPromptsOutput> {
  const result = await callModel(input, 0)
  if (result) return result

  const retry = await callModel(input, 1)
  if (retry) return retry

  throw new Error('Failed to expand prompts after 2 attempts')
}
