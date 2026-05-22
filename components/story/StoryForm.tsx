'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { GenerateOptions } from '@/lib/types'
import { savePendingStory } from '@/lib/storage'

const DEFAULTS: GenerateOptions = {
  density: '12',
  style: 'expressive',
  tone: 'inspirational',
  imageModel: 'flux-schnell-fal',
  videoModel: 'ltx-video-fal',
  videoQuality: '1080p',
  textModel: 'gemini-2.5-flash',
}

const STORAGE_PREFIX = 'new-story:options:'

type OptionItem<T extends string> = { value: T; label: string }

const DENSITY_OPTIONS: OptionItem<GenerateOptions['density']>[] = [
  { value: '8', label: '8 scenes' },
  { value: '10', label: '10 scenes' },
  { value: '12', label: '12 scenes' },
  { value: '16', label: '16 scenes' },
  { value: '20', label: '20 scenes' },
  { value: '25', label: '25 scenes' },
  { value: '30', label: '30 scenes' },
  { value: '35', label: '35 scenes' },
  { value: '40', label: '40 scenes' },
  { value: '45', label: '45 scenes' },
  { value: '50', label: '50 scenes' },
  { value: '55', label: '55 scenes' },
  { value: '60', label: '60 scenes' },
]
const STYLE_OPTIONS: OptionItem<GenerateOptions['style']>[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'expressive', label: 'Expressive' },
  { value: 'dramatic', label: 'Dramatic' },
]
const TONE_OPTIONS: OptionItem<GenerateOptions['tone']>[] = [
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'casual', label: 'Casual' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'pitch', label: 'Pitch' },
]
const VIDEO_QUALITY_OPTIONS: OptionItem<GenerateOptions['videoQuality']>[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
]

const TEXT_MODEL_OPTIONS: OptionItem<GenerateOptions['textModel']>[] = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'groq/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B (Groq)' },
  { value: 'nvidia/nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B' },
] as const

const IMAGE_MODEL_OPTIONS: OptionItem<GenerateOptions['imageModel']>[] = [
  { value: 'flux-schnell-fal', label: 'Flux Schnell' },
  { value: 'sdxl-lightning-fal', label: 'SDXL Lightning' },
  { value: 'flux-dev-fal', label: 'Flux Dev' },
] as const

const VIDEO_MODEL_OPTIONS: OptionItem<GenerateOptions['videoModel']>[] = [
  { value: 'ltx-video-fal', label: 'LTX Video' },
  { value: 'longcat-fal', label: 'LongCat' },
  { value: 'kling-fal', label: 'Kling v2.6' },
] as const

function newStoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function StoryForm({ category }: { category: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [options, setOptions] = useState<GenerateOptions>(DEFAULTS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + category)
      if (raw) setOptions({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [category])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + category, JSON.stringify(options))
    } catch { /* ignore */ }
  }, [options, category])

  const submit = async () => {
    const trimmed = text.trim()
    if (trimmed.length < 20) {
      setError('Story needs at least 20 characters to plan scenes.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const id = newStoryId()
      savePendingStory({
        id,
        category,
        storyInput: trimmed,
        options,
        createdAt: Date.now(),
      })
      toast.success('Cooking your story…')
      router.push(`/${category}/story/${id}?starting=1`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start'
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">◈ {category}</span>
        <h1 style={{ marginTop: 10 }}>New story</h1>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="story" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Your story</label>
        <textarea
          id="story"
          className="min-h-[260px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
          placeholder="Drop the story. Founder journey, narrative, anything. The wilder the better."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfigPill
          label="Scenes"
          value={`${options.density}`}
          current={options.density}
          options={DENSITY_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, density: next as GenerateOptions['density'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Style"
          value={STYLE_OPTIONS.find((v) => v.value === options.style)?.label ?? titleCase(options.style)}
          current={options.style}
          options={STYLE_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, style: next as GenerateOptions['style'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Tone"
          value={TONE_OPTIONS.find((v) => v.value === options.tone)?.label ?? titleCase(options.tone)}
          current={options.tone}
          options={TONE_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, tone: next as GenerateOptions['tone'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Script"
          value={TEXT_MODEL_OPTIONS.find((m) => m.value === options.textModel)?.label ?? options.textModel}
          current={options.textModel}
          options={TEXT_MODEL_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, textModel: next as GenerateOptions['textModel'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Image"
          value={IMAGE_MODEL_OPTIONS.find((m) => m.value === options.imageModel)?.label ?? options.imageModel}
          current={options.imageModel}
          options={IMAGE_MODEL_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, imageModel: next as GenerateOptions['imageModel'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Video"
          value={VIDEO_MODEL_OPTIONS.find((m) => m.value === options.videoModel)?.label ?? options.videoModel}
          current={options.videoModel}
          options={VIDEO_MODEL_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, videoModel: next as GenerateOptions['videoModel'] }))}
          disabled={submitting}
        />

        <ConfigPill
          label="Quality"
          value={options.videoQuality}
          current={options.videoQuality}
          options={VIDEO_QUALITY_OPTIONS}
          onChange={(next) => setOptions((prev) => ({ ...prev, videoQuality: next as GenerateOptions['videoQuality'] }))}
          disabled={submitting}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface))] px-3.5 py-2.5 text-[0.85rem] text-[var(--text)]">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="min-h-6" />

      <button
        className="inline-flex h-[46px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={submit}
        disabled={submitting || !text.trim()}
      >
        <Sparkles size={16} />
        {submitting ? 'Starting…' : 'Generate Story'}
      </button>
    </div>
  )
}

function titleCase(value: string): string {
  return value
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function ConfigPill({
  label,
  value,
  current,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  current: string
  options: OptionItem<string>[]
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-inherit text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          <span className="text-[0.68rem] text-[var(--muted)]">{label}</span>
          <span className="text-[0.72rem]">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-1.5">
        <div className="flex max-h-[190px] flex-col gap-px overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full cursor-pointer rounded-[5px] border border-transparent bg-transparent px-[7px] py-[5px] text-left font-inherit text-[0.74rem] leading-[1.2] text-[var(--text)] hover:bg-[var(--surface2)] ${current === opt.value ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--surface2)_75%,var(--accent)_25%)]' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
