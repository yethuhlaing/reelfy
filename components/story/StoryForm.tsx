'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  { value: 'nvidia/nemotron-ultra-253b-v1', label: 'Nemotron Ultra 253B' },
  { value: 'nvidia/nemotron-3-nano-30b-a3b', label: 'Nemotron Nano 30B' },
  { value: 'nvidia/nemotron-nano-9b-v2', label: 'Nemotron Nano 9B' },
  { value: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', label: 'Llama 3.3 49B' },
  { value: 'nvidia/nemotron-nano-12b-v2', label: 'Nemotron Nano 12B' },
  { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'nvidia/mixtral-8x22b-instruct-v0.1', label: 'Mixtral 8x22B' },
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
    <div className="form-shell">
      <div>
        <span className="chip">◈ {category}</span>
        <h1 style={{ marginTop: 10 }}>New story</h1>
      </div>

      <div className="field">
        <label htmlFor="story" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Your story</label>
        <textarea
          id="story"
          placeholder="Drop the story. Founder journey, narrative, anything. The wilder the better."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="option-pill-bar">
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
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="cost-preview-slot" />

      <button
        className="icon-btn icon-btn--primary"
        onClick={submit}
        disabled={submitting || !text.trim()}
        style={{ height: 46, justifyContent: 'center', fontSize: '0.95rem' }}
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
        <button type="button" className="option-pill" disabled={disabled}>
          <span className="option-pill-label">{label}</span>
          <span className="option-pill-value">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="option-pill-popover">
        <div className="option-pill-options">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-pill-option ${current === opt.value ? 'active' : ''}`}
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
