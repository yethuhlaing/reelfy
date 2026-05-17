'use client'

import { Play } from 'lucide-react'
import type { ActionState } from '@/lib/states/workspace-state'

export function PlayAllBtn({ state, onClick }: { state: ActionState; onClick: () => void }) {
  if (!state.visible) return null
  return (
    <button
      className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onClick}
      disabled={state.disabled}
      title="Play all"
    >
      <Play size={14} /> Play
    </button>
  )
}
