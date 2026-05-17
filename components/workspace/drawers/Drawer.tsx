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
      {placement === 'right' && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={placement === 'top-right' ? 'drawer-float' : 'drawer-panel'} role="dialog" aria-label={title}>
        {title && (
          <div className="drawer-header">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="drawer-body">{children}</div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
