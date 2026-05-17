'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { ActionState } from '@/lib/states/workspace-state'

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
        <button className="icon-btn icon-btn--primary" disabled={state.disabled}>
          <Sparkles size={14} /> {state.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="text-sm font-medium mb-1">Animate all scenes?</div>
        <div className="text-xs text-muted-foreground mb-3">Runs in background. Costs add up per scene.</div>
        <div className="flex justify-end gap-2">
          <button className="icon-btn" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="icon-btn icon-btn--primary"
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
