// Caption model list — pure data + helpers, no server-only imports (env,
// fetch), so it is safe to import from both the client form and the caption
// server module. Kept separate from caption.ts, which does pull in env.

export const CAPTION_MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-5', label: 'GPT-5' },
] as const

export type CaptionModel = (typeof CAPTION_MODEL_OPTIONS)[number]['value']

export const CAPTION_MODEL_VALUES = CAPTION_MODEL_OPTIONS.map((o) => o.value) as readonly string[]

/** Default caption model. Cheap, fast, plenty good for short meme captions. */
export const CAPTION_MODEL: CaptionModel = 'gpt-4o-mini'

/** Coerce an arbitrary input to a valid caption model, falling back to default. */
export function resolveCaptionModel(input?: string): CaptionModel {
  return input && CAPTION_MODEL_VALUES.includes(input) ? (input as CaptionModel) : CAPTION_MODEL
}
