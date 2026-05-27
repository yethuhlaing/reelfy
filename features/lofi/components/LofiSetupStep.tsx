'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { ConfigPill } from './ConfigPill'
import {
  DURATION_OPTIONS,
  MUSIC_MODEL_OPTIONS,
  VISUAL_MODEL_OPTIONS,
} from '@/features/lofi/lib/pricing-constants'
import { TEXT_MODEL_OPTIONS } from '@/shared/lib/text-model-options'
import type { TextModel } from '@/shared/lib/types'

const VISUAL_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: String(n) }
})

interface Props {
  vibe: string
  onVibeChange: (v: string) => void
  duration: number
  onDurationChange: (v: number) => void
  textModel: TextModel
  onTextModelChange: (v: TextModel) => void
  musicModel: string
  onMusicModelChange: (v: string) => void
  visualModel: string
  onVisualModelChange: (v: string) => void
  visualCount: number
  onVisualCountChange: (v: number) => void
  isExpanding: boolean
  onNext: () => void
}

export function LofiSetupStep({
  vibe,
  onVibeChange,
  duration,
  onDurationChange,
  textModel,
  onTextModelChange,
  musicModel,
  onMusicModelChange,
  visualModel,
  onVisualModelChange,
  visualCount,
  onVisualCountChange,
  isExpanding,
  onNext,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="vibe" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Vibe
        </label>
        <textarea
          id="vibe"
          className="min-h-[80px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 font-[var(--font-body)] text-[0.95rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px]"
          placeholder="rainy tokyo café after midnight — mellow keys, soft vinyl crackle, distant espresso hiss"
          value={vibe}
          onChange={(e) => onVibeChange(e.target.value)}
          disabled={isExpanding}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfigPill
          label="Duration"
          value={DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? `${Math.round(duration / 60)}min`}
          options={DURATION_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          current={String(duration)}
          onChange={(v) => onDurationChange(Number(v))}
          disabled={isExpanding}
        />
        <ConfigPill
          label="Script"
          value={TEXT_MODEL_OPTIONS.find((m) => m.value === textModel)?.label ?? textModel}
          options={TEXT_MODEL_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
          current={textModel}
          onChange={(v) => onTextModelChange(v as TextModel)}
          disabled={isExpanding}
        />
        <ConfigPill
          label="Music"
          value={MUSIC_MODEL_OPTIONS.find((m) => m.value === musicModel)?.label ?? musicModel}
          options={MUSIC_MODEL_OPTIONS}
          current={musicModel}
          onChange={onMusicModelChange}
          disabled={isExpanding}
        />
        <ConfigPill
          label="Visual model"
          value={VISUAL_MODEL_OPTIONS.find((m) => m.value === visualModel)?.label ?? visualModel}
          options={VISUAL_MODEL_OPTIONS}
          current={visualModel}
          onChange={onVisualModelChange}
          disabled={isExpanding}
        />
        <ConfigPill
          label="Visuals"
          value={String(visualCount)}
          options={VISUAL_COUNT_OPTIONS}
          current={String(visualCount)}
          onChange={(v) => onVisualCountChange(Number(v))}
          disabled={isExpanding}
        />
      </div>

      <button
        className="inline-flex h-[46px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={onNext}
        disabled={isExpanding || !vibe.trim()}
      >
        {isExpanding ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Expanding prompts…
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Next →
          </>
        )}
      </button>
    </div>
  )
}
