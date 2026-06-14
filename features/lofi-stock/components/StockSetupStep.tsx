'use client'

import { ChevronLeft, Loader2 } from 'lucide-react'
import { ConfigPill } from '@/features/lofi/components/ConfigPill'
import { DURATION_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS } from '@/shared/lib/text-model-options'
import { VISUAL_COUNT_OPTIONS } from '@/features/lofi-stock/lib/visual-count-options'
import { AiPromptInput } from '@/shared/ui/ai-prompt-input'
import { PlaylistDurationMeter } from './PlaylistDurationMeter'
import type { TextModel } from '@/shared/lib/types'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

const STOCK_VIBE_PLACEHOLDERS = [
  'rainy tokyo cafe after midnight - mellow keys, soft vinyl crackle, distant espresso hiss',
  'golden-hour city rooftops with lazy drums, warm bass, and nostalgic guitar textures',
  'quiet mountain cabin in winter, sparse piano, tape hiss, and deep focus atmosphere',
]

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
  onBack,
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
  onBack?: () => void
}) {
  const pillsDisabled = disabled || isContinuing

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <p className="text-[0.85rem] text-[var(--muted)]">
        Describe the mood, video length, and generation settings. Scene ideas are created on the next step.
      </p>

      <AiPromptInput
        id="lofi-stock-vibe"
        label="Vibe"
        value={vibe}
        onChange={onVibeChange}
        placeholders={STOCK_VIBE_PLACEHOLDERS}
        disabled={pillsDisabled}
      />

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

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            className="inline-flex h-[46px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={onBack}
            disabled={isContinuing}
          >
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
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
    </div>
  )
}
