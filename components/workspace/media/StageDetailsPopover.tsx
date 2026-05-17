'use client'

import { useEffect, useRef } from 'react'
import type { Stage } from '@/lib/types'
import { StageList } from './StageList'

interface Props {
  open: boolean
  onClose: () => void
  stages: Stage[]
  imageProgress: { done: number; total: number } | null
}

export function StageDetailsPopover({ open, onClose, stages, imageProgress }: Props) {
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
      <div className="fixed inset-0 z-[540] bg-transparent" />
      <div
        className="absolute right-5 top-14 z-[541] min-w-[280px] max-w-[360px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
        ref={ref}
        role="dialog"
        aria-label="Generation details"
      >
        <StageList stages={stages} imageProgress={imageProgress} />
      </div>
    </>
  )
}
