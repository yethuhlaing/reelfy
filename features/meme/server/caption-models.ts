// Caption model list — pure data + helpers, no server-only imports (env,
// fetch), so it is safe to import from both the client form and the caption
// server module. Kept separate from caption.ts, which does pull in env.

export const CAPTION_MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
] as const

export type CaptionModel = (typeof CAPTION_MODEL_OPTIONS)[number]['value']

export const CAPTION_MODEL_VALUES = CAPTION_MODEL_OPTIONS.map((o) => o.value) as readonly string[]

/** Default caption model. Cheap, fast, good at meme voice. */
export const CAPTION_MODEL: CaptionModel = 'openai/gpt-4o-mini'

/** Coerce an arbitrary input to a valid caption model, falling back to default. */
export function resolveCaptionModel(input?: string): CaptionModel {
  return input && CAPTION_MODEL_VALUES.includes(input) ? (input as CaptionModel) : CAPTION_MODEL
}
