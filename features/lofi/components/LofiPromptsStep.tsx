'use client'

import { ChevronLeft, Sparkles } from 'lucide-react'
import { LofiPromptList } from './LofiPromptList'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import type { VisualMode } from '@/shared/lib/types'

interface Props {
  musicPrompts: string[]
  onMusicPromptsChange: (prompts: string[]) => void
  onRegenerateMusic: (index: number) => void
  onAddMusic: (() => void) | undefined
  visualPrompts: string[]
  onVisualPromptsChange: (prompts: string[]) => void
  onRegenerateVisual: (index: number) => void
  onAddVisual: (() => void) | undefined
  visualMode: VisualMode
  duration: number
  onRegenerateAll: () => void
  onNext: () => void
  onBack?: () => void
}

export function LofiPromptsStep({
  musicPrompts,
  onMusicPromptsChange,
  onRegenerateMusic,
  onAddMusic,
  visualPrompts,
  onVisualPromptsChange,
  onRegenerateVisual,
  onAddVisual,
  visualMode,
  duration,
  onRegenerateAll,
  onNext,
  onBack,
}: Props) {
  const isSingle = visualMode === 'single-image' || visualMode === 'single-video'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-1 text-[0.75rem] text-[var(--accent)] hover:underline"
          onClick={onRegenerateAll}
        >
          <Sparkles size={13} /> Regenerate all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[0.85rem] font-semibold text-[var(--text)]">
              Music prompts ({musicPrompts.length})
            </span>
          </div>
          <LofiPromptList
            prompts={musicPrompts}
            onChange={(i, v) => {
              const updated = [...musicPrompts]
              updated[i] = v
              onMusicPromptsChange(updated)
            }}
            onRegenerate={onRegenerateMusic}
            onRemove={(i) => onMusicPromptsChange(musicPrompts.filter((_, idx) => idx !== i))}
            onAdd={onAddMusic}
            collapsedHint={`${musicPrompts.length} music prompts (click to expand)`}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[0.85rem] font-semibold text-[var(--text)]">
              Visual prompts ({visualPrompts.length})
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.68rem] text-[var(--muted)]">
              {visualMode}
            </span>
          </div>
          <LofiPromptList
            prompts={visualPrompts}
            onChange={(i, v) => {
              const updated = [...visualPrompts]
              updated[i] = v
              onVisualPromptsChange(updated)
            }}
            onRegenerate={onRegenerateVisual}
            onRemove={(i) => onVisualPromptsChange(visualPrompts.filter((_, idx) => idx !== i))}
            onAdd={onAddVisual}
          />
          {!isSingle && (
            <div className="mt-2 text-[0.75rem] text-[var(--muted)]">
              Total visual duration:{' '}
              {visualPrompts.reduce(
                (sum, _, i) => sum + calcVisualDuration(i, visualMode, visualPrompts.length, duration),
                0,
              )}
              s = target {Math.round(duration / 60)}min{visualPrompts.length > 0 ? ' ✓' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            className="inline-flex h-[46px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 text-[0.85rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={onBack}
          >
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <div />
        )}
        <button
          className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onNext}
          disabled={musicPrompts.length === 0 || visualPrompts.length === 0}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
