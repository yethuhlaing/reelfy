'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Loader2, Play, Sparkles, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { Stepper } from '@/shared/ui/stepper'
import {
  BRAINROT_CAPTION_POSITION_OPTIONS,
  BRAINROT_EXPORT_MIN_CREDITS,
  BRAINROT_FORMAT_OPTIONS,
  BRAINROT_SCRIPT_MAX_WORDS,
  BRAINROT_SECONDS_PER_WORD,
  BRAINROT_WRITE_CREDITS,
  brainrotExportCredits,
} from '@/features/brainrot/constants'
import { brainrotHref } from '@/shared/lib/categories'
import type { BrainrotCaptionPosition, BrainrotFormat } from '@/shared/lib/types/brainrot'
import type { BrainrotVoice } from '@/app/api/brainrot/voices/route'
import type { GameplayCategory } from '@/shared/data/gameplay-catalog'

const STEPS = [
  { id: 'content', label: 'Content' },
  { id: 'style', label: 'Style' },
  { id: 'voice', label: 'Voice' },
  { id: 'export', label: 'Export' },
]

const STORAGE_KEY = 'new-brainrot:options'

type SavedOptions = {
  format: BrainrotFormat
  backgroundCategory: string
  characterVoiceId: string
  captionPosition: BrainrotCaptionPosition
}

function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

function estDuration(words: number): string {
  const sec = Math.round(words * BRAINROT_SECONDS_PER_WORD)
  if (sec < 60) return `~${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `~${m}m ${s}s`
}

export function BrainrotForm({ onBackToStart }: { onBackToStart?: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState('content')
  const [script, setScript] = useState('')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<SavedOptions>({
    format: 'facts',
    backgroundCategory: '',
    characterVoiceId: '',
    captionPosition: 'bottom',
  })
  const [catalog, setCatalog] = useState<{
    categories: GameplayCategory[]
  } | null>(null)
  const [voices, setVoices] = useState<BrainrotVoice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // AI writer popover
  const [aiOpen, setAiOpen] = useState(false)
  const [aiIdea, setAiIdea] = useState('')
  const [aiWriting, setAiWriting] = useState(false)

  useEffect(() => {
    try {
      const pending = localStorage.getItem('new:pending-prompt')
      if (pending) {
        setScript(pending)
        localStorage.removeItem('new:pending-prompt')
      }
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setOptions((prev) => ({ ...prev, ...JSON.parse(raw) }))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
    } catch { /* ignore */ }
  }, [options])

  useEffect(() => {
    fetch('/api/brainrot/catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setCatalog(d)
        setOptions((prev) => ({
          ...prev,
          backgroundCategory: prev.backgroundCategory || d.categories[0]?.id || '',
        }))
      })
      .catch(() => {})
    fetch('/api/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { balance?: number } | null) => d && setBalance(d.balance ?? null))
      .catch(() => {})
  }, [])

  // Curated ElevenLabs voices — loaded lazily when the Voice step is first shown.
  useEffect(() => {
    if (step !== 'voice' || voices.length > 0) return
    setVoicesLoading(true)
    fetch('/api/brainrot/voices')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { voices?: BrainrotVoice[] } | null) => {
        const list = d?.voices ?? []
        setVoices(list)
        setOptions((prev) => ({
          ...prev,
          characterVoiceId: prev.characterVoiceId || list[0]?.voice_id || '',
        }))
      })
      .catch(() => {})
      .finally(() => setVoicesLoading(false))
  }, [step, voices.length])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)
  const wordCount = countWords(script)
  const overLimit = wordCount > BRAINROT_SCRIPT_MAX_WORDS
  // Export cost is bucketed by script length; show the live price for this script.
  const exportCredits = wordCount > 0 ? brainrotExportCredits(wordCount) : BRAINROT_EXPORT_MIN_CREDITS

  const stopPreview = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  const toggleVoicePreview = (voice: BrainrotVoice) => {
    if (!voice.preview_url) return
    if (playingId === voice.voice_id) {
      stopPreview()
      return
    }
    stopPreview()
    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    setPlayingId(voice.voice_id)
    audio.play().catch(() => {})
    audio.onended = () => setPlayingId(null)
  }

  const openAi = () => {
    setAiIdea(script.trim())
    setError(null)
    setAiOpen(true)
  }

  const runAiWrite = async () => {
    if (aiIdea.trim().length < 3) {
      setError('Describe your idea in a few words first.')
      return
    }
    setAiWriting(true)
    setError(null)
    try {
      const res = await fetch('/api/brainrot/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: aiIdea.trim(), format: options.format }),
      })
      const data = await res.json()
      if (res.status === 402) throw new Error('Not enough credits to write with AI.')
      if (!res.ok) throw new Error(data.error ?? 'Script generation failed')
      setScript(data.script)
      setTitle(data.title)
      if (data.balance != null) setBalance(data.balance)
      setAiOpen(false)
      toast.success('Script written')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Script generation failed')
    } finally {
      setAiWriting(false)
    }
  }

  const saveDraft = async (): Promise<boolean> => {
    setSavingDraft(true)
    setError(null)
    try {
      const res = await fetch('/api/brainrot/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId ?? undefined,
          script: script.trim(),
          title: title.trim() || undefined,
          format: options.format,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save draft')
      setProjectId(data.projectId)
      setTitle(data.title)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft')
      return false
    } finally {
      setSavingDraft(false)
    }
  }

  const goNext = async () => {
    if (step === 'content') {
      if (script.trim().length < 3) {
        setError('Write a script or generate one with AI first.')
        return
      }
      if (overLimit) {
        setError(`Script is too long — keep it under ${BRAINROT_SCRIPT_MAX_WORDS} words.`)
        return
      }
      setError(null)
      const ok = await saveDraft()
      if (!ok) return
      setStep('style')
      return
    }
    if (step === 'style') {
      if (!options.backgroundCategory) {
        setError('Pick a gameplay category.')
        return
      }
      setError(null)
    }
    if (step === 'voice') {
      if (!options.characterVoiceId) {
        setError('Pick a voice.')
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
    setError(null)
    const prev = STEPS[currentStepIndex - 1]
    if (prev) setStep(prev.id)
  }

  const handleExport = async () => {
    if (!projectId || !script.trim()) return
    setExporting(true)
    setError(null)
    try {
      const res = await fetch('/api/brainrot/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          script: script.trim(),
          backgroundCategory: options.backgroundCategory,
          characterVoiceId: options.characterVoiceId,
          captionPosition: options.captionPosition,
        }),
      })
      const data = await res.json()
      if (res.status === 402) throw new Error('Not enough credits to export.')
      if (!res.ok) throw new Error(data.error ?? 'Export failed')
      if (data.balance != null) setBalance(data.balance)
      toast.success('Rendering your brainrot reel…')
      router.push(`${brainrotHref(projectId)}?jobId=${encodeURIComponent(data.jobId)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setExporting(false)
    }
  }

  const setOpt = <K extends keyof SavedOptions>(k: K, v: SavedOptions[K]) =>
    setOptions((prev) => ({ ...prev, [k]: v }))

  const categoryLabel = catalog?.categories.find((c) => c.id === options.backgroundCategory)?.label
  const voiceLabel = voices.find((v) => v.voice_id === options.characterVoiceId)?.name

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ▶ Brainrot
        </span>
        <h1 style={{ marginTop: 10 }}>New brainrot reel</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Gameplay background + AI voice + viral captions. From {BRAINROT_EXPORT_MIN_CREDITS} credits per export.
        </p>
      </div>

      <div className="glass-panel flex flex-col gap-5 p-6 md:p-8">
      <Stepper
        steps={STEPS}
        currentStep={step}
        onStepClick={(id) => {
          const idx = STEPS.findIndex((s) => s.id === id)
          if (idx < currentStepIndex) setStep(id)
        }}
      />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 'content' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="brainrot-title" className="text-[0.8rem] text-[var(--muted)]">
              Title <span className="text-[var(--muted)]/70">(optional)</span>
            </label>
            <input
              id="brainrot-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-generated from your script if left blank"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="brainrot-script" className="text-[0.8rem] text-[var(--muted)]">
                Your script
              </label>
              <button
                type="button"
                onClick={openAi}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Sparkles size={13} /> Write with AI · {BRAINROT_WRITE_CREDITS} credit
              </button>
            </div>
            <textarea
              id="brainrot-script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={10}
              placeholder="Type or paste your script exactly as it should be spoken…"
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>{estDuration(wordCount)} spoken</span>
              <span className={overLimit ? 'text-red-400' : undefined}>
                {wordCount} / {BRAINROT_SCRIPT_MAX_WORDS} words
              </span>
            </div>
          </div>

          {aiOpen && (
            <div className="rounded-xl border border-[var(--accent)]/40 bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles size={15} /> Write script with AI
                </p>
                <button
                  type="button"
                  onClick={() => setAiOpen(false)}
                  aria-label="Close"
                  className="text-[var(--muted)] hover:text-[var(--text)]"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={aiIdea}
                onChange={(e) => setAiIdea(e.target.value)}
                rows={3}
                placeholder="Describe your idea, e.g. '5 psychology tricks that actually work'"
                className="mb-3 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
              />
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">Format</p>
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {BRAINROT_FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setOpt('format', f.value)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      options.format === f.value
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="font-medium">{f.label}</div>
                    <div className="text-xs text-[var(--muted)]">{f.hint}</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void runAiWrite()}
                disabled={aiWriting}
                className="inline-flex h-[38px] items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {aiWriting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles size={15} />}
                Generate · {BRAINROT_WRITE_CREDITS} credit
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'style' && catalog && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium">Gameplay category</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {catalog.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setOpt('backgroundCategory', cat.id)}
                  className={`overflow-hidden rounded-lg border text-left transition ${
                    options.backgroundCategory === cat.id
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brainrot/${cat.id}.png`} alt="" className="aspect-[9/16] w-full object-cover" />
                  <div className="px-2 py-1.5 text-sm font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Caption position</p>
            <div className="flex gap-2">
              {BRAINROT_CAPTION_POSITION_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setOpt('captionPosition', p.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    options.captionPosition === p.value
                      ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                      : 'border-[var(--border)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'voice' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Voice</p>
          {voicesLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted)]">
              <Loader2 className="size-4 animate-spin" /> Loading voices…
            </div>
          ) : voices.length === 0 ? (
            <p className="py-8 text-sm text-[var(--muted)]">No voices available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {voices.map((voice) => {
                const selected = options.characterVoiceId === voice.voice_id
                const previewing = playingId === voice.voice_id
                const gender = voice.labels?.gender ?? ''
                const accent = voice.labels?.accent ?? ''
                const meta = voice.hint || [gender, accent].filter(Boolean).join(' · ')
                return (
                  <div
                    key={voice.voice_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpt('characterVoiceId', voice.voice_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpt('characterVoiceId', voice.voice_id)
                      }
                    }}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                      selected
                        ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {voice.preview_url && (
                      <button
                        type="button"
                        aria-label={previewing ? 'Stop preview' : 'Play preview'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVoicePreview(voice)
                        }}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {previewing ? <Square size={12} /> : <Play size={12} />}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{voice.name}</p>
                      {meta && <p className="truncate text-xs capitalize text-[var(--muted)]">{meta}</p>}
                    </div>
                    {selected && <Check size={16} className="shrink-0 text-[var(--accent)]" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {step === 'export' && (
        <div className="flex flex-col gap-4">
          {title && <p className="text-sm font-semibold">{title}</p>}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Script · {estDuration(wordCount)}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{script}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {categoryLabel && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
                <div className="text-[var(--muted)]">Gameplay</div>
                <div className="font-medium">{categoryLabel}</div>
              </div>
            )}
            {voiceLabel && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
                <div className="text-[var(--muted)]">Voice</div>
                <div className="font-medium">{voiceLabel}</div>
              </div>
            )}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2">
              <div className="text-[var(--muted)]">Captions</div>
              <div className="font-medium capitalize">{options.captionPosition}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex gap-2">
          {onBackToStart && (
            <button type="button" onClick={onBackToStart} className="text-sm text-[var(--muted)]">
              ← All types
            </button>
          )}
          {currentStepIndex > 0 && (
            <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-sm">
              <ChevronLeft size={16} /> Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {balance != null && (
            <span className="text-xs text-[var(--muted)]">{balance} credits</span>
          )}
          {step === 'export' ? (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting || !script.trim()}
              className="inline-flex h-[40px] items-center gap-2 rounded-lg border border-transparent bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Generate video · {exportCredits} credits
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={savingDraft}
              className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingDraft ? <Loader2 className="size-4 animate-spin" /> : null}
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
