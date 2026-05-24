'use client'

import { Play } from 'lucide-react'
import type { ActionState } from '@/features/workspace/lib/workspace-state'

export function PlayAllBtn({ state, onClick }: { state: ActionState; onClick: () => void }) {
  if (!state.visible) return null
  return (
    <button
      className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] shadow-[0_0_0_1px_var(--accent),0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] hover:shadow-[0_0_0_1px_var(--accent-hover),0_12px_32px_-8px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onClick}
      disabled={state.disabled}
      title="Play all"
    >
      <Play size={14} /> Play
    </button>
  )
}
