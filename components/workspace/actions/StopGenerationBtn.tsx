'use client'

import { useState } from 'react'
import { Square } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ActionState } from '@/lib/states/workspace-state'

export function StopGenerationBtn({ state, onStop }: { state: ActionState; onStop: () => void }) {
  const [open, setOpen] = useState(false)
  if (!state.visible) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="icon-btn icon-btn--danger" disabled={state.disabled}>
          <Square size={12} fill="currentColor" /> Stop
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="text-sm font-medium mb-2">Stop all running work?</div>
        <div className="flex justify-end gap-2">
          <button className="icon-btn" onClick={() => setOpen(false)}>Keep going</button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={() => {
              onStop()
              setOpen(false)
            }}
          >
            Stop
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
