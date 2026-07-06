'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover'
import type { ActionState } from '@/features/workspace/lib/workspace-state'

interface Props {
  state: ActionState
  onConfirm: () => void
}

export function AnimateAllBtn({ state, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  if (!state.visible) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={state.disabled}
        >
          <Sparkles size={14} className="text-[var(--accent)]" /> {state.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="text-sm font-medium mb-1">Animate all scenes?</div>
        <div className="text-xs text-muted-foreground mb-3">Runs in background. Costs add up per scene.</div>
        <div className="flex justify-end gap-2">
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-2.5 font-semibold text-[var(--accent-ink)] transition hover:brightness-105"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Start
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
