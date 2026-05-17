'use client'

import { Sparkles } from 'lucide-react'

export function CreditsPill() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]"
      title="Credits — coming soon"
    >
      <Sparkles size={12} />
      <span>—</span>
    </div>
  )
}
