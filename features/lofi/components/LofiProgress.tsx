'use client'

import { Loader2 } from 'lucide-react'
import { lofiPhaseLabel, type LofiRunPhase } from '@/features/lofi/lib/lofi-run-view'

export function LofiProgress({
  musicReady,
  musicTotal,
  visualReady,
  visualTotal,
  phase,
}: {
  musicReady: number
  musicTotal: number
  visualReady: number
  visualTotal: number
  phase: LofiRunPhase | null
}) {
  const total = musicTotal + visualTotal
  const ready = musicReady + visualReady
  // Rendering is the last thing that happens, so the bar is full by then even
  // though the file is not written yet.
  const pct = phase === 'rendering' ? 100 : total > 0 ? Math.round((ready / total) * 100) : 0

  return (
    <div className="flex flex-col gap-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-live="polite">
      <div className="flex items-center gap-2 text-[0.85rem] text-[var(--text)]">
        <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
        <span>{lofiPhaseLabel(phase)}</span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div
          className="rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-4 text-[0.75rem] text-[var(--muted)]">
        <span>Music: {musicReady} / {musicTotal} ready</span>
        <span>Visual: {visualReady} / {visualTotal} ready</span>
      </div>
    </div>
  )
}
