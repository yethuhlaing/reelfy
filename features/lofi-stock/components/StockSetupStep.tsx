'use client'

import { Loader2 } from 'lucide-react'
import { ConfigPill } from '@/features/lofi/components/ConfigPill'
import { DURATION_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS } from '@/shared/lib/text-model-options'
import { VISUAL_COUNT_OPTIONS } from '@/features/lofi-stock/lib/visual-count-options'
import { PlaylistDurationMeter } from './PlaylistDurationMeter'
import type { TextModel } from '@/shared/lib/types'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function StockSetupStep({
  vibe,
  onVibeChange,
  duration,
  onDurationChange,
  textModel,
  onTextModelChange,
  visualCount,
  onVisualCountChange,
  selectedTracks,
  disabled,
  isContinuing,
  onContinue,
  continueDisabled,
}: {
  vibe: string
  onVibeChange: (value: string) => void
  duration: number
  onDurationChange: (sec: number) => void
  textModel: TextModel
  onTextModelChange: (model: TextModel) => void
  visualCount: number
  onVisualCountChange: (count: number) => void
  selectedTracks: FreetouseTrack[]
  disabled?: boolean
  isContinuing: boolean
  onContinue: () => void
  continueDisabled: boolean
}) {
  const pillsDisabled = disabled || isContinuing

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <p className="text-[0.85rem] text-[var(--muted)]">
        Describe the mood, video length, and generation settings. Scene ideas are created on the next step.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="lofi-stock-vibe" className="text-[0.8rem] text-[var(--muted)]">
          Vibe
        </label>
        <textarea
          id="lofi-stock-vibe"
          className="min-h-[100px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
          placeholder="rainy tokyo café after midnight — mellow keys, soft vinyl crackle, distant espresso hiss"
          value={vibe}
          onChange={(e) => onVibeChange(e.target.value)}
          disabled={pillsDisabled}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfigPill
          label="Duration"
          value={DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? `${Math.round(duration / 60)}min`}
          options={DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          current={String(duration)}
          onChange={(v) => onDurationChange(Number(v))}
          disabled={pillsDisabled}
        />
        <ConfigPill
          label="Script"
          value={TEXT_MODEL_OPTIONS.find((m) => m.value === textModel)?.label ?? textModel}
          options={TEXT_MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          current={textModel}
          onChange={(v) => onTextModelChange(v as TextModel)}
          disabled={pillsDisabled}
        />
        <ConfigPill
          label="Visuals"
          value={String(visualCount)}
          options={VISUAL_COUNT_OPTIONS}
          current={String(visualCount)}
          onChange={(v) => onVisualCountChange(Number(v))}
          disabled={pillsDisabled}
        />
      </div>

      {selectedTracks.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-2 text-[0.75rem] font-medium text-[var(--muted)]">Your playlist vs video length</p>
          <PlaylistDurationMeter tracks={selectedTracks} targetDurationSec={duration} />
        </div>
      )}

      <button
        type="button"
        className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={onContinue}
        disabled={continueDisabled || isContinuing}
      >
        {isContinuing ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Planning visuals…
          </>
        ) : (
          'Continue to visuals'
        )}
      </button>
    </div>
  )
}
