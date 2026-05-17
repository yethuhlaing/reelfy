'use client'

import { Download } from 'lucide-react'
import { useExportState } from '@/context/export-state'

interface Props {
  onClick: () => void
}

export function RenderingPill({ onClick }: Props) {
  const { state } = useExportState()
  if (state.status !== 'rendering' && state.status !== 'preparing') return null
  return (
    <button
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-1 text-xs text-[var(--text)] transition hover:bg-[var(--surface)]"
      onClick={onClick}
      title="Open export progress"
    >
      <Download size={12} /> Rendering {state.progress}%
    </button>
  )
}
