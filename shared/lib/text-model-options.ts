import type { TextModel } from '@/shared/lib/types'

export const TEXT_MODEL_OPTIONS: { value: TextModel; label: string }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'openrouter/deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { value: 'openrouter/google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)' },
  { value: 'openrouter/qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B (free)' },
  { value: 'nvidia/nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B' },
]

export const DEFAULT_TEXT_MODEL: TextModel = 'gemini-2.5-flash'

export const TEXT_MODEL_VALUES = TEXT_MODEL_OPTIONS.map((o) => o.value)
