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
    <button className="rendering-pill" onClick={onClick} title="Open export progress">
      <Download size={12} /> Rendering {state.progress}%
    </button>
  )
}
