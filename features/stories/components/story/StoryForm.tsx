'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, AlertCircle, ChevronRight, ChevronLeft, Play, Square, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { GenerateOptions } from '@/shared/lib/types'
import { TEXT_MODEL_OPTIONS } from '@/shared/lib/text-model-options'
import { savePendingStory } from '@/features/stories/server/pending-story'
import { Stepper } from '@/shared/ui/stepper'
import { AiPromptInput } from '@/shared/ui/ai-prompt-input'
import type { ElevenLabsVoice } from '@/app/api/voices/route'
import { storyHref } from '@/shared/lib/categories'

const STEPS = [
  { id: 'prompt', label: 'Story' },
  { id: 'visual', label: 'Visual' },
  { id: 'script', label: 'Script' },
  { id: 'voice', label: 'Voice' },
]

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

const IMAGE_MODEL_OPTIONS = [
  { value: 'flux-schnell-fal', label: 'Flux Schnell', hint: 'fast · $0.003' },
  { value: 'sdxl-lightning-fal', label: 'SDXL Lightning', hint: 'fastest · $0.002' },
  { value: 'flux-dev-fal', label: 'Flux Dev', hint: 'quality · $0.04' },
] as const

const VIDEO_MODEL_OPTIONS = [
  { value: 'ltx-video-fal', label: 'LTX Video', hint: 'fast · $0.02' },
  { value: 'longcat-fal', label: 'LongCat', hint: 'balanced · $0.03' },
  { value: 'kling-fal', label: 'Kling v2.6', hint: 'quality · $0.05' },
] as const

const STYLE_OPTIONS = [
  { value: 'minimal', label: 'Minimal', hint: 'Clean, simple characters' },
  { value: 'expressive', label: 'Expressive', hint: 'Dynamic, emotive poses' },
  { value: 'dramatic', label: 'Dramatic', hint: 'High contrast, bold scenes' },
  { value: 'editorial', label: 'Editorial', hint: 'Clean explainer, fresh visual per scene' },
] as const

const VIDEO_QUALITY_OPTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
] as const

const DENSITY_OPTIONS = ['8','10','12','16','20','25','30','35','40','45','50','55','60'] as const

const TONE_OPTIONS = [
  { value: 'inspirational', label: 'Inspirational', hint: 'Motivating, uplifting delivery' },
  { value: 'casual', label: 'Casual', hint: 'Conversational, relaxed' },
  { value: 'documentary', label: 'Documentary', hint: 'Calm, authoritative narration' },
  { value: 'pitch', label: 'Pitch', hint: 'Confident, persuasive' },
] as const

const STORY_PROMPT_PLACEHOLDERS = [
  'A cinematic stickman explainer about a world where humans suddenly stop dreaming forever...',
  'A founder survives three failed launches before finding product-market fit in an unlikely niche.',
  'A tiny remote team turns a side project into a global movement in twelve months.',
]

function newStoryId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function StoryForm({ category, onBackToStart }: { category: string; onBackToStart?: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<string>('prompt')
  const [text, setText] = useState('')
  const [options, setOptions] = useState<GenerateOptions>(DEFAULTS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const voicesFetchedRef = useRef(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + category)
      if (raw) setOptions({ ...DEFAULTS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [category])

  useEffect(() => {
    try {
      const pending = localStorage.getItem('new:pending-prompt')
      if (pending) {
        setText(pending)
        localStorage.removeItem('new:pending-prompt')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + category, JSON.stringify(options))
    } catch { /* ignore */ }
  }, [options, category])

  // Prefetch voices when user reaches script step (step 3)
  useEffect(() => {
    if (step !== 'script' || voicesFetchedRef.current) return
    voicesFetchedRef.current = true
    setVoicesLoading(true)
    fetch('/api/voices')
      .then((r) => r.json())
      .then((d: { voices: ElevenLabsVoice[] }) => setVoices(d.voices ?? []))
      .catch(() => {})
      .finally(() => setVoicesLoading(false))
  }, [step])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const stopPreview = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  const togglePreview = (voice: ElevenLabsVoice) => {
    if (playingId === voice.voice_id) { stopPreview(); return }
    stopPreview()
    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    setPlayingId(voice.voice_id)
    audio.play().catch(() => {})
    audio.onended = () => setPlayingId(null)
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  const goNext = () => {
    if (step === 'prompt') {
      if (text.trim().length < 20) {
        setError('Story needs at least 20 characters to plan scenes.')
        return
      }
      setError(null)
    }
    stopPreview()
    const next = STEPS[currentStepIndex + 1]
    if (next) setStep(next.id)
  }

  const goBack = () => {
    stopPreview()
    const prev = STEPS[currentStepIndex - 1]
    if (prev) setStep(prev.id)
  }

  const submit = async () => {
    const trimmed = text.trim()
    setError(null)
    setSubmitting(true)
    stopPreview()
    try {
      const id = newStoryId()
      savePendingStory({ id, category, storyInput: trimmed, options, createdAt: Date.now() })
      toast.success('Cooking your story…')
      router.push(storyHref(id, { starting: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start')
      setSubmitting(false)
    }
  }

  const set = <K extends keyof GenerateOptions>(k: K, v: GenerateOptions[K]) =>
    setOptions((prev) => ({ ...prev, [k]: v }))

  const selectedVoice = voices.find((v) => v.voice_id === options.voiceId)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">◈ {category}</span>
        <h1 style={{ marginTop: 10 }}>New story</h1>
      </div>

      <div className="glass-panel flex flex-col gap-5 p-6 md:p-8">
        <Stepper
          steps={STEPS}
          currentStep={step}
          onStepClick={(id) => setStep(id)}
        />

        {/* Step 1 — Prompt */}
      {step === 'prompt' && (
        <div className="flex flex-col gap-3">
          <AiPromptInput
            id="story"
            label="Your story"
            value={text}
            onChange={(value) => {
              setText(value)
              if (error) setError(null)
            }}
            placeholders={STORY_PROMPT_PLACEHOLDERS}
            disabled={submitting}
          />
          {error && <ErrorBanner message={error} />}
        </div>
      )}

      {/* Step 2 — Visual */}
      {step === 'visual' && (
        <div className="flex flex-col gap-5">
          <SectionHeading title="Visual style" subtitle="How scenes look and animate" />
          <OptionGrid>
            <OptionCard label="Stick style" value={options.style} options={STYLE_OPTIONS} onSelect={(v) => set('style', v as GenerateOptions['style'])} />
            <OptionCard label="Image model" value={options.imageModel} options={IMAGE_MODEL_OPTIONS} onSelect={(v) => set('imageModel', v as GenerateOptions['imageModel'])} />
            <OptionCard label="Video model" value={options.videoModel} options={VIDEO_MODEL_OPTIONS} onSelect={(v) => set('videoModel', v as GenerateOptions['videoModel'])} />
            <OptionCard
              label="Video quality"
              value={options.videoQuality}
              options={VIDEO_QUALITY_OPTIONS}
              onSelect={(v) => set('videoQuality', v as GenerateOptions['videoQuality'])}
            />
          </OptionGrid>
        </div>
      )}

      {/* Step 3 — Script */}
      {step === 'script' && (
        <div className="flex flex-col gap-5">
          <SectionHeading title="Script & narration" subtitle="How the story is written and delivered" />
          <OptionGrid>
            <OptionCard
              label="Voice tone"
              value={options.tone}
              options={TONE_OPTIONS}
              onSelect={(v) => set('tone', v as GenerateOptions['tone'])}
            />
            <div>
              <p className="mb-1.5 text-[0.78rem] text-[var(--muted)]">Scene density</p>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-2 text-[0.85rem] text-[var(--text)]"
                value={options.density}
                onChange={(e) => set('density', e.target.value as GenerateOptions['density'])}
              >
                {DENSITY_OPTIONS.map((n) => <option key={n} value={n}>{n} scenes</option>)}
              </select>
            </div>
            <OptionCard
              label="Script model"
              value={options.textModel}
              options={TEXT_MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label, hint: '' }))}
              onSelect={(v) => set('textModel', v as GenerateOptions['textModel'])}
            />
          </OptionGrid>
        </div>
      )}

      {/* Step 4 — Voice */}
      {step === 'voice' && (
        <div className="flex flex-col gap-4">
          <SectionHeading title="Choose a voice" subtitle="Preview and select the voice for your voiceover" />
          {voicesLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[var(--muted)]">Loading voices…</div>
          ) : voices.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-[var(--muted)]">No voices available</div>
          ) : (
            <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 max-h-[420px] overflow-y-auto">
              {voices.map((voice) => {
                const isSelected = voice.voice_id === options.voiceId
                const isPreviewing = playingId === voice.voice_id
                const gender = voice.labels?.gender ?? ''
                const accent = voice.labels?.accent ?? ''
                const useCase = voice.labels?.use_case ?? ''
                const meta = [gender, accent, useCase].filter(Boolean).join(' · ')

                return (
                  <div
                    key={voice.voice_id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition cursor-pointer hover:bg-[var(--surface2)] ${isSelected ? 'bg-[color-mix(in_srgb,var(--surface2)_50%,var(--accent)_12%)] ring-1 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]' : ''}`}
                    onClick={() => set('voiceId', voice.voice_id)}
                  >
                    <button
                      type="button"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                      onClick={(e) => { e.stopPropagation(); togglePreview(voice) }}
                      title={isPreviewing ? 'Stop preview' : 'Preview voice'}
                    >
                      {isPreviewing
                        ? <Square size={9} fill="currentColor" />
                        : <Play size={9} fill="currentColor" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] font-medium text-[var(--text)] truncate">{voice.name}</p>
                      {meta && <p className="text-[0.7rem] text-[var(--muted)] capitalize truncate">{meta}</p>}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0 text-[var(--accent)]" />}
                  </div>
                )
              })}
            </div>
          )}
          {selectedVoice && (
            <p className="text-[0.78rem] text-[var(--muted)]">
              Selected: <span className="font-medium text-[var(--text)]">{selectedVoice.name}</span>
            </p>
          )}
          {!options.voiceId && (
            <p className="text-[0.78rem] text-[var(--muted)]">No voice selected — will use default voice.</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {currentStepIndex > 0 ? (
          <button
            type="button"
            className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={goBack}
            disabled={submitting}
          >
            <ChevronLeft size={15} /> Back
          </button>
        ) : onBackToStart ? (
          <button
            type="button"
            className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={onBackToStart}
            disabled={submitting}
          >
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}

        {step !== 'voice' ? (
          <button
            type="button"
            className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-5 text-[0.85rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={goNext}
            disabled={submitting}
          >
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-5 text-[0.85rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={submit}
            disabled={submitting || !text.trim()}
          >
            <Sparkles size={15} />
            {submitting ? 'Starting…' : 'Generate Story'}
          </button>
        )}
      </div>
      </div>
    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-[0.95rem] font-semibold text-[var(--text)]">{title}</p>
      <p className="text-[0.78rem] text-[var(--muted)]">{subtitle}</p>
    </div>
  )
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
}

function OptionCard({
  label,
  value,
  options,
  onSelect,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string; hint?: string }[]
  onSelect: (v: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.78rem] text-[var(--muted)]">{label}</p>
      <div className="flex flex-col gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
              value === opt.value
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--surface2)_50%,var(--accent)_12%)]'
                : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--accent)_30%)]'
            }`}
          >
            <span className="text-[0.82rem] font-medium text-[var(--text)]">{opt.label}</span>
            {opt.hint && <span className="text-[0.7rem] text-[var(--muted)]">{opt.hint}</span>}
            {value === opt.value && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--danger)_40%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface))] px-3.5 py-2.5 text-[0.85rem] text-[var(--text)]">
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
  )
}
