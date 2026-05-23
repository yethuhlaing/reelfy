'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { ActionState } from '@/lib/states/workspace-state'
import type { Scene } from '@/lib/types'
import { ExportModal } from '../ExportModal'
import { RenderingPill } from '../status/RenderingPill'

interface Props {
  state: ActionState
  storyId: string | null
  scenes: Scene[]
}

export function ExportBtn({ state, storyId, scenes }: Props) {
  const [open, setOpen] = useState(false)
  if (!storyId) return null
  return (
    <>
      <RenderingPill onClick={() => setOpen(true)} />
      {state.visible && (
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-2.5 text-[var(--text)] backdrop-blur-md transition hover:bg-[var(--surface2)] hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={state.disabled}
          onClick={() => setOpen(true)}
          title="Export MP4"
        >
          <Download size={14} /> Export
        </button>
      )}
      <ExportModal open={open} onClose={() => setOpen(false)} storyId={storyId} scenes={scenes} />
    </>
  )
}
