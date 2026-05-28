'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, X, Plus } from 'lucide-react'

function AutoGrowTextarea({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      className="min-h-[40px] flex-1 resize-none overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 py-2 text-[0.82rem] text-[var(--text)] outline-none focus:border-transparent focus:outline-2 focus:outline-[var(--accent)]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function LofiPromptList({
  prompts,
  onChange,
  onRegenerate,
  onRemove,
  onAdd,
  collapsedHint,
}: {
  prompts: string[]
  onChange: (index: number, value: string) => void
  onRegenerate: (index: number) => void
  onRemove?: (index: number) => void
  onAdd?: () => void
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
      {visible.map((prompt, visibleIndex) => {
        const index = collapsed ? visibleIndex : visibleIndex
        return (
          <div key={index} className="flex items-start gap-2">
            <AutoGrowTextarea
              value={prompt}
              onChange={(v) => onChange(index, v)}
            />
            <button
              type="button"
              className="mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-solid)] text-[var(--muted)] hover:text-[var(--text)]"
              onClick={() => onRegenerate(index)}
              title="Regenerate"
            >
              <RefreshCw size={13} />
            </button>
            {onRemove && (
              <button
                type="button"
                className="mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-solid)] text-[var(--muted)] hover:text-[var(--danger)]"
                onClick={() => onRemove(index)}
                title="Remove"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )
      })}
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
      {onAdd && (
        <button
          type="button"
          className="mt-0.5 inline-flex cursor-pointer items-center gap-1 self-start text-[0.75rem] text-[var(--accent)] hover:underline"
          onClick={onAdd}
        >
          <Plus size={13} /> Add
        </button>
      )}
    </div>
  )
}
