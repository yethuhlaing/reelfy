'use client'

import { useEffect, useRef } from 'react'
import type { Stage } from '@/lib/types'
import { StageList } from './StageList'

interface Props {
  open: boolean
  onClose: () => void
  stages: Stage[]
  imageProgress: { done: number; total: number } | null
  onCancel?: () => void
}

export function StageDetailsPopover({ open, onClose, stages, imageProgress, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="stage-popover-backdrop" />
      <div className="stage-popover" ref={ref} role="dialog" aria-label="Generation details">
        <StageList stages={stages} imageProgress={imageProgress} onCancel={onCancel} />
      </div>
    </>
  )
}
