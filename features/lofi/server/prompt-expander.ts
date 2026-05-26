import { lofiPlanRequest } from '@/shared/lib/prompts/lofi-plan'
import { getTextProvider } from '@/shared/lib/providers/text/text'
import type { TextModel } from '@/shared/lib/types'
import type { VisualMode, AmbientBed } from '@/shared/lib/types'

export interface ExpandPromptsInput {
  vibe: string
  targetDurationSec: number
  targetMusicCount: number
  targetVisualCount: number
  textModel: TextModel
}

export interface ExpandPromptsOutput {
  musicPrompts: string[]
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: AmbientBed | null
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
  const instruction = lofiPlanRequest(input, retryCount > 0)

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
