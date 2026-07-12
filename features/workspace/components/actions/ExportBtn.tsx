'use client'

import { Download } from 'lucide-react'
import type { ActionState } from '@/features/workspace/lib/workspace-state'
import type { Scene } from '@/shared/lib/types'
import { useExportState } from '@/features/workspace/context/export-state'
import { ExportModal } from '../ExportModal'
import { RenderingPill } from '../status/RenderingPill'

interface Props {
  state: ActionState
  storyId: string | null
  scenes: Scene[]
}

export function ExportBtn({ state, storyId, scenes }: Props) {
  const { modalOpen, openModal, closeModal } = useExportState()
  if (!storyId) return null
  return (
    <>
      <RenderingPill onClick={openModal} />
      {state.visible && (
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 font-semibold text-[var(--accent-ink)] shadow-[0_0_0_1px_var(--accent),0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] hover:shadow-[0_0_0_1px_var(--accent-hover),0_12px_32px_-8px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={state.disabled}
          onClick={openModal}
          title="Export MP4"
        >
          <Download size={14} /> Export
        </button>
      )}
      <ExportModal open={modalOpen} onClose={closeModal} storyId={storyId} scenes={scenes} />
    </>
  )
}
