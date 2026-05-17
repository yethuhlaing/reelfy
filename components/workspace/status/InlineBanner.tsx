'use client'

import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface Props {
  variant?: 'error' | 'warning' | 'info'
  title?: string
  message: string
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
}

const ICONS = { error: AlertCircle, warning: AlertTriangle, info: Info }

export function InlineBanner({ variant = 'info', title, message, onDismiss, action }: Props) {
  const Icon = ICONS[variant]
  return (
    <div className={`inline-banner inline-banner--${variant}`} role="alert">
      <Icon size={16} />
      <div className="inline-banner__body">
        {title && <strong style={{ display: 'block' }}>{title}</strong>}
        <span>{message}</span>
        {action && (
          <button
            className="icon-btn"
            style={{ marginLeft: 10, height: 22, padding: '0 8px', fontSize: '0.72rem' }}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button className="inline-banner__close" onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
