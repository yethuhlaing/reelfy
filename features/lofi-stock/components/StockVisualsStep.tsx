'use client'

import { ChevronLeft, Sparkles, Loader2 } from 'lucide-react'
import { ConfigPill } from '@/features/lofi/components/ConfigPill'
import { LofiPromptList } from '@/features/lofi/components/LofiPromptList'
import { VISUAL_MODEL_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import type { ExpandResult } from '@/features/lofi-stock/lib/expand-types'

export function StockVisualsStep({
  expandResult,
  editedVisualPrompts,
  onPromptsChange,
  onRegenerateVisual,
  onRemoveVisual,
  onAddVisual,
  onRegenerateAll,
  duration,
  visualModel,
  onVisualModelChange,
  disabled,
  isExpanding,
  onContinue,
  continueDisabled,
  onBack,
}: {
  expandResult: ExpandResult | null
  editedVisualPrompts: string[]
  onPromptsChange: (prompts: string[]) => void
  onRegenerateVisual: (index: number) => Promise<void>
  onRemoveVisual: (index: number) => void
  onAddVisual: () => Promise<void>
  onRegenerateAll: () => Promise<void>
  duration: number
  visualModel: string
  onVisualModelChange: (model: string) => void
  disabled?: boolean
  isExpanding: boolean
  onContinue: () => void
  continueDisabled: boolean
  onBack?: () => void
}) {
  const isSingle = expandResult
    ? expandResult.visualMode === 'single-image' || expandResult.visualMode === 'single-video'
    : false

  if (isExpanding || !expandResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-[var(--muted)]">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        <p className="text-[0.85rem]">Generating scene ideas from your vibe…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[0.85rem] text-[var(--muted)]">
        Choose an image model and edit scene prompts below.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ConfigPill
          label="Visual model"
          value={VISUAL_MODEL_OPTIONS.find((m) => m.value === visualModel)?.label ?? visualModel}
          options={VISUAL_MODEL_OPTIONS}
          current={visualModel}
          onChange={onVisualModelChange}
          disabled={disabled}
        />
        <div className="flex justify-end">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 text-[0.75rem] text-[var(--accent)] hover:underline disabled:opacity-50"
          onClick={() => void onRegenerateAll()}
          disabled={disabled}
        >
          <Sparkles size={13} /> Regenerate all scenes
        </button>
        </div>
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
            onPromptsChange(updated)
          }}
          onRegenerate={(i) => void onRegenerateVisual(i)}
          onRemove={onRemoveVisual}
          onAdd={editedVisualPrompts.length < 12 ? () => void onAddVisual() : undefined}
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

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            className="inline-flex h-[46px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={onBack}
            disabled={disabled}
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
          disabled={continueDisabled || disabled}
        >
          Continue to review
        </button>
      </div>
    </div>
  )
}
