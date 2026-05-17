'use client'

import { Play } from 'lucide-react'
import type { ActionState } from '@/lib/states/workspace-state'

export function PlayAllBtn({ state, onClick }: { state: ActionState; onClick: () => void }) {
  if (!state.visible) return null
  return (
    <button className="icon-btn" onClick={onClick} disabled={state.disabled} title="Play all">
      <Play size={14} /> Play
    </button>
  )
}
