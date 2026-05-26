'use client'

import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

export function LofiPromptList({
  prompts,
  onChange,
  onRegenerate,
  onRemove,
  collapsedHint,
}: {
  prompts: string[]
  onChange: (index: number, value: string) => void
  onRegenerate: (index: number) => void
  onRemove?: (index: number) => void
  collapsedHint?: string
}) {
  const [collapsed, setCollapsed] = useState(prompts.length > 10)
  const visible = collapsed ? prompts.slice(0, 3) : prompts

  return (
    <div className="flex flex-col gap-2">
      {prompts.length > 10 && collapsed && (
        <button
          type="button"
          className="mb-1 text-left text-[0.75rem] text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => setCollapsed(false)}
        >
          {collapsedHint ?? `${prompts.length} prompts (click to expand)`}
        </button>
      )}
      {visible.map((prompt, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea
            className="min-h-[40px] flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.82rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)]"
            value={prompt}
            onChange={(e) => onChange(collapsed ? i : i, e.target.value)}
            rows={1}
          />
          <button
            type="button"
            className="mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            onClick={() => onRegenerate(collapsed ? i : i)}
            title="Regenerate"
          >
            <RefreshCw size={13} />
          </button>
          {onRemove && (
            <button
              type="button"
              className="mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--danger)]"
              onClick={() => onRemove(collapsed ? i : i)}
              title="Remove"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
      {collapsed && prompts.length > 3 && (
        <button
          type="button"
          className="text-left text-[0.75rem] text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => setCollapsed(false)}
        >
          Show all {prompts.length} prompts...
        </button>
      )}
      {!collapsed && prompts.length > 3 && (
        <button
          type="button"
          className="text-left text-[0.75rem] text-[var(--muted)] hover:text-[var(--text)]"
          onClick={() => setCollapsed(true)}
        >
          Collapse
        </button>
      )}
    </div>
  )
}
