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
  const variantClass =
    variant === 'error'
      ? 'border-[#ef4444] bg-[rgba(239,68,68,0.12)] text-[#fca5a5]'
      : variant === 'warning'
        ? 'border-[#ca8a04] bg-[rgba(202,138,4,0.12)] text-[#fcd34d]'
        : 'border-[var(--border)] bg-[var(--surface2)]'
  return (
    <div className={`my-2 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${variantClass}`} role="alert">
      <Icon size={16} />
      <div className="flex-1 text-[0.82rem]">
        {title && <strong className="block">{title}</strong>}
        <span>{message}</span>
        {action && (
          <button
            className="ml-2.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[0.72rem] text-[var(--text)]"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button className="border-0 bg-transparent text-inherit" onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
