import type { TextModel } from '@/shared/lib/types'

export const TEXT_MODEL_OPTIONS: { value: TextModel; label: string }[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-5', label: 'GPT-5' },
]

export const DEFAULT_TEXT_MODEL: TextModel = 'gpt-4o-mini'

export const TEXT_MODEL_VALUES = TEXT_MODEL_OPTIONS.map((o) => o.value)
