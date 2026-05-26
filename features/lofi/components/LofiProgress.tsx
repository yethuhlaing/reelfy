'use client'

import { Loader2 } from 'lucide-react'

export function LofiProgress({
  musicReady,
  musicTotal,
  visualReady,
  visualTotal,
  status,
}: {
  musicReady: number
  musicTotal: number
  visualReady: number
  visualTotal: number
  status: string
}) {
  const total = musicTotal + visualTotal
  const ready = musicReady + visualReady
  const pct = total > 0 ? Math.round((ready / total) * 100) : 0

  return (
    <div className="flex flex-col gap-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-live="polite">
      <div className="flex items-center gap-2 text-[0.85rem] text-[var(--text)]">
        <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
        <span>
          {status === 'rendering'
            ? 'Rendering video... (this can take 5-15 min)'
            : status === 'gating'
              ? 'Compiling arrangement...'
              : 'Generating assets...'}
        </span>
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
