import type { TextModel } from '@/shared/lib/types'

export const TEXT_MODEL_OPTIONS: { value: TextModel; label: string }[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { value: 'openrouter/qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B (free)' },
  { value: 'openrouter/openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
  { value: 'openrouter/google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
  { value: 'openrouter/google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)' },
  { value: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B (free)' },
  { value: 'nvidia/nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B' },
]

export const DEFAULT_TEXT_MODEL: TextModel = 'gemini-2.5-flash'

export const TEXT_MODEL_VALUES = TEXT_MODEL_OPTIONS.map((o) => o.value)
