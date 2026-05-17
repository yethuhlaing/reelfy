'use client'

import { Sparkles } from 'lucide-react'

export function CreditsPill() {
  return (
    <div className="chip" title="Credits — coming soon">
      <Sparkles size={12} />
      <span>—</span>
    </div>
  )
}
