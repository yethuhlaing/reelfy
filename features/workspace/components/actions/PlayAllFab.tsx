'use client'

import { Play } from 'lucide-react'
import type { ActionState } from '@/features/workspace/lib/workspace-state'

// Floating action button, bottom-right. Icon only. Primary "play all scenes".
export function PlayAllFab({ state, onClick }: { state: ActionState; onClick: () => void }) {
  if (!state.visible) return null
  return (
    <button
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-transparent bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_0_0_1px_var(--accent),0_12px_32px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] hover:shadow-[0_0_0_1px_var(--accent-hover),0_16px_40px_-8px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-45"
      onClick={onClick}
      disabled={state.disabled}
      title="Play all scenes"
      aria-label="Play all scenes"
    >
      <Play size={22} fill="currentColor" />
    </button>
  )
}
