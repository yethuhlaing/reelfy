'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

export function ConfigPill({
  label,
  value,
  current,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  current: string
  options: { value: string; label: string }[]
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-inherit text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          <span className="text-[0.68rem] text-[var(--muted)]">{label}</span>
          <span className="text-[0.72rem]">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-1.5">
        <div className="flex max-h-[190px] flex-col gap-px overflow-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full cursor-pointer rounded-[5px] border border-transparent bg-transparent px-[7px] py-[5px] text-left font-inherit text-[0.74rem] leading-[1.2] text-[var(--text)] hover:bg-[var(--surface2)] ${
                current === opt.value
                  ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--surface2)_75%,var(--accent)_25%)]'
                  : ''
              }`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
