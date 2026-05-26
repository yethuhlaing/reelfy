'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import {
  DURATION_OPTIONS,
  MUSIC_MODEL_OPTIONS,
  VISUAL_MODEL_OPTIONS,
} from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS, DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { LofiCostPreview } from './LofiCostPreview'
import { LofiPromptList } from './LofiPromptList'
import { ConfigPill } from './ConfigPill'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import type { TextModel, VisualMode, VisualAsset } from '@/shared/lib/types'

const DEFAULT_MUSIC_MODEL = 'minimax'
const DEFAULT_VISUAL_MODEL = 'flux-schnell-fal'
const LOFI_OPTIONS_STORAGE_KEY = 'new-lofi:options'
const DEFAULT_DURATION_SEC = 3600

const VISUAL_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: String(n) }
})

interface ExpandResult {
  musicPrompts: string[]
  visualPrompts: string[]
  visualMode: VisualMode
  suggestedTitle: string
  suggestedAmbientBed: string | null
}

export function LofiForm() {
  const router = useRouter()

  const [vibe, setVibe] = useState('')
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SEC)
  const [visualCount, setVisualCount] = useState(4)
  const [musicModel, setMusicModel] = useState(DEFAULT_MUSIC_MODEL)
  const [visualModel, setVisualModel] = useState(DEFAULT_VISUAL_MODEL)
  const [textModel, setTextModel] = useState<TextModel>(DEFAULT_TEXT_MODEL)

  const [phase, setPhase] = useState<'idle' | 'expanding' | 'editing' | 'submitting'>('idle')
  const [expandResult, setExpandResult] = useState<ExpandResult | null>(null)
  const [editedMusicPrompts, setEditedMusicPrompts] = useState<string[]>([])
  const [editedVisualPrompts, setEditedVisualPrompts] = useState<string[]>([])
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOFI_OPTIONS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { textModel?: TextModel }
      if (parsed.textModel && TEXT_MODEL_OPTIONS.some((o) => o.value === parsed.textModel)) {
        setTextModel(parsed.textModel)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOFI_OPTIONS_STORAGE_KEY, JSON.stringify({ textModel }))
    } catch { /* ignore */ }
  }, [textModel])

  const expandBody = (overrides?: { targetVisualCount?: number }) => ({
    vibe: vibe.trim(),
    targetDurationSec: duration,
    textModel,
    targetVisualCount:
      overrides?.targetVisualCount ??
      (phase === 'editing' ? editedVisualPrompts.length : visualCount),
  })

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/user/credits')
      if (res.ok) {
        const data = await res.json() as { credits?: number }
        setBalance(data.credits ?? null)
      }
    } catch { /* ignore */ }
  }, [])

  const handleExpand = async () => {
    const trimmed = vibe.trim()
    if (trimmed.length < 10) {
      toast.error('Vibe needs at least 10 characters.')
      return
    }
    setPhase('expanding')

    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody()),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to expand prompts')
      }

      const result = (await res.json()) as ExpandResult
      setExpandResult(result)
      setEditedMusicPrompts([...result.musicPrompts])
      setEditedVisualPrompts([...result.visualPrompts])
      setPhase('editing')
      fetchBalance()
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not generate prompts. Please try again.'))
      setPhase('idle')
    }
  }

  const handleRegenerateMusic = async (index: number) => {
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to regenerate prompt')
      }
      const result = (await res.json()) as ExpandResult
      const updated = [...editedMusicPrompts]
      updated[index] = result.musicPrompts[0] ?? ''
      setEditedMusicPrompts(updated)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate that prompt. Please try again.'))
    }
  }

  const handleRegenerateVisual = async (index: number) => {
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to regenerate prompt')
      }
      const result = (await res.json()) as ExpandResult
      const updated = [...editedVisualPrompts]
      updated[index] = result.visualPrompts[0] ?? ''
      setEditedVisualPrompts(updated)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate that prompt. Please try again.'))
    }
  }

  const handleAddMusic = async () => {
    const insertIndex = editedMusicPrompts.length
    setEditedMusicPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to add prompt')
      }
      const result = (await res.json()) as ExpandResult
      setEditedMusicPrompts((prev) => {
        const updated = [...prev]
        updated[insertIndex] = result.musicPrompts[0] ?? ''
        return updated
      })
    } catch (err) {
      setEditedMusicPrompts((prev) => prev.filter((_, i) => i !== insertIndex))
      toast.error(toUserErrorMessage(err, 'Could not add that prompt. Please try again.'))
    }
  }

  const handleAddVisual = async () => {
    const insertIndex = editedVisualPrompts.length
    setEditedVisualPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expandBody({ targetVisualCount: 1 })),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to add prompt')
      }
      const result = (await res.json()) as ExpandResult
      setEditedVisualPrompts((prev) => {
        const updated = [...prev]
        updated[insertIndex] = result.visualPrompts[0] ?? ''
        return updated
      })
    } catch (err) {
      setEditedVisualPrompts((prev) => prev.filter((_, i) => i !== insertIndex))
      toast.error(toUserErrorMessage(err, 'Could not add that prompt. Please try again.'))
    }
  }

  const handleSubmit = async () => {
    if (!expandResult) return
    setPhase('submitting')

    const visualMode = expandResult.visualMode
    const assets: VisualAsset[] = editedVisualPrompts.map((prompt, i) => ({
      prompt,
      durationSec: calcVisualDuration(i, visualMode, editedVisualPrompts.length, duration),
    }))

    try {
      const res = await fetch('/api/lofi/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe: vibe.trim(),
          targetDurationSec: duration,
          musicModel,
          musicLoopCount: editedMusicPrompts.length,
          visualConfig: {
            mode: visualMode,
            model: visualModel,
            assets,
          },
          musicPrompts: editedMusicPrompts,
          visualPrompts: editedVisualPrompts,
          suggestedTitle: expandResult.suggestedTitle,
          suggestedAmbientBed: expandResult.suggestedAmbientBed,
        }),
      })

      const data = await res.json() as { videoId?: string; storyId?: string; error?: string }

      if (!res.ok || !data.videoId) {
        throw new Error(data.error ?? 'Failed to generate video')
      }

      toast.success('Generation started!')
      router.push(`/lofi/story/${data.videoId}`)
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not start generation. Please try again.'))
      setPhase('editing')
    }
  }

  const isSingle = expandResult
    ? expandResult.visualMode === 'single-image' || expandResult.visualMode === 'single-video'
    : false

  const displayedVisualCount = phase === 'editing' ? editedVisualPrompts.length : visualCount

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-[18px] px-6 pb-20">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]">
          ◈ lofi
        </span>
        <h1 style={{ marginTop: 10 }}>New lofi video</h1>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="vibe" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Vibe
        </label>
        <textarea
          id="vibe"
          className="min-h-[80px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
          placeholder="rainy tokyo café after midnight — mellow keys, soft vinyl crackle, distant espresso hiss"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          disabled={phase === 'expanding' || phase === 'submitting'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfigPill
          label="Duration"
          value={DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? `${Math.round(duration / 60)}min`}
          options={DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          current={String(duration)}
          onChange={(v) => setDuration(Number(v))}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Script"
          value={TEXT_MODEL_OPTIONS.find((m) => m.value === textModel)?.label ?? textModel}
          options={TEXT_MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          current={textModel}
          onChange={(v) => setTextModel(v as TextModel)}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Music"
          value={MUSIC_MODEL_OPTIONS.find((m) => m.value === musicModel)?.label ?? musicModel}
          options={MUSIC_MODEL_OPTIONS}
          current={musicModel}
          onChange={setMusicModel}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Visual model"
          value={VISUAL_MODEL_OPTIONS.find((m) => m.value === visualModel)?.label ?? visualModel}
          options={VISUAL_MODEL_OPTIONS}
          current={visualModel}
          onChange={setVisualModel}
          disabled={phase !== 'idle'}
        />

        <ConfigPill
          label="Visuals"
          value={String(displayedVisualCount)}
          options={VISUAL_COUNT_OPTIONS}
          current={String(displayedVisualCount)}
          onChange={(v) => setVisualCount(Number(v))}
          disabled={phase !== 'idle'}
        />
      </div>

      {phase === 'editing' && expandResult && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 text-[0.75rem] text-[var(--accent)] hover:underline"
              onClick={async () => {
                try {
                  const res = await fetch('/api/lofi/expand-prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expandBody()),
                  })
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({})) as { error?: string }
                    throw new Error(data.error ?? 'Failed to expand prompts')
                  }
                  const result = (await res.json()) as ExpandResult
                  setExpandResult(result)
                  setEditedMusicPrompts(result.musicPrompts)
                  setEditedVisualPrompts(result.visualPrompts)
                } catch (err) {
                  toast.error(toUserErrorMessage(err, 'Could not regenerate prompts. Please try again.'))
                }
              }}
            >
              <Sparkles size={13} /> Regenerate all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[0.85rem] font-semibold text-[var(--text)]">
                  Music prompts ({editedMusicPrompts.length})
                </span>
              </div>
              <LofiPromptList
                prompts={editedMusicPrompts}
                onChange={(i, v) => {
                  const updated = [...editedMusicPrompts]
                  updated[i] = v
                  setEditedMusicPrompts(updated)
                }}
                onRegenerate={handleRegenerateMusic}
                onRemove={(i) => setEditedMusicPrompts(editedMusicPrompts.filter((_, idx) => idx !== i))}
                onAdd={editedMusicPrompts.length < 30 ? handleAddMusic : undefined}
                collapsedHint={`${editedMusicPrompts.length} music prompts (click to expand)`}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[0.85rem] font-semibold text-[var(--text)]">
                  Visual prompts ({editedVisualPrompts.length})
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.68rem] text-[var(--muted)]">
                  {expandResult.visualMode}
                </span>
              </div>
              <LofiPromptList
                prompts={editedVisualPrompts}
                onChange={(i, v) => {
                  const updated = [...editedVisualPrompts]
                  updated[i] = v
                  setEditedVisualPrompts(updated)
                }}
                onRegenerate={handleRegenerateVisual}
                onRemove={(i) => setEditedVisualPrompts(editedVisualPrompts.filter((_, idx) => idx !== i))}
                onAdd={editedVisualPrompts.length < 12 ? handleAddVisual : undefined}
              />
              {!isSingle && (
                <div className="mt-2 text-[0.75rem] text-[var(--muted)]">
                  Total visual duration:{' '}
                  {editedVisualPrompts.reduce(
                    (sum, _, i) =>
                      sum + calcVisualDuration(i, expandResult.visualMode, editedVisualPrompts.length, duration),
                    0,
                  )}
                  s = target {Math.round(duration / 60)}min {editedVisualPrompts.length > 0 ? '✓' : ''}
                </div>
              )}
            </div>
          </div>

          <LofiCostPreview
            musicModel={musicModel}
            musicLoopCount={editedMusicPrompts.length}
            visualModel={visualModel}
            visualAssetCount={editedVisualPrompts.length}
            balance={balance}
          />
        </div>
      )}

      <div className="min-h-6" />

      <button
        className="inline-flex h-[46px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={phase === 'editing' ? handleSubmit : handleExpand}
        disabled={
          phase === 'expanding' ||
          phase === 'submitting' ||
          (phase === 'idle' && !vibe.trim())
        }
      >
        {phase === 'expanding' || phase === 'submitting' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {phase === 'expanding'
          ? 'Expanding...'
          : phase === 'submitting'
            ? 'Generating...'
            : phase === 'editing'
              ? 'Generate Video'
              : 'Expand Prompts →'}
      </button>
    </div>
  )
}
