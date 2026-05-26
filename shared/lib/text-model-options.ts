import type { TextModel } from '@/shared/lib/types'

export const TEXT_MODEL_OPTIONS: { value: TextModel; label: string }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'groq/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B (Groq)' },
  { value: 'nvidia/nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B' },
]

export const DEFAULT_TEXT_MODEL: TextModel = 'gemini-2.5-flash'

export const TEXT_MODEL_VALUES = TEXT_MODEL_OPTIONS.map((o) => o.value)
