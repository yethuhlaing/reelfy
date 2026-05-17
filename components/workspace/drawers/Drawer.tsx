'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  placement?: 'right' | 'top-right'
  children: ReactNode
}

export function Drawer({ open, onClose, title, placement = 'right', children }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const content = (
    <>
      {placement === 'right' && <div className="fixed inset-0 z-[600] bg-black/45" onClick={onClose} />}
      <div
        className={
          placement === 'top-right'
            ? 'fixed right-3.5 top-16 z-[580] max-h-[80vh] w-[360px] max-w-[calc(100vw-28px)] overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]'
            : 'fixed inset-y-0 right-0 z-[601] flex w-[min(480px,100vw)] flex-col border-l border-[var(--border)] bg-[var(--surface)]'
        }
        role="dialog"
        aria-label={title}
      >
        {title && (
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3 font-[var(--font-heading)] font-semibold">
            <h3>{title}</h3>
            <button
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] p-0 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="overflow-auto p-4">{children}</div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
