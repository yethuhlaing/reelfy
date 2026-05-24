'use client'

import { Sparkles } from 'lucide-react'
import { getUserCredits, type SessionUser } from '@/features/auth/server/auth-session'

interface CreditsPillProps {
  user: SessionUser | null
}

export function CreditsPill({ user }: CreditsPillProps) {
  const credits = getUserCredits(user)

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-[0.75rem] font-bold text-[var(--accent)] shadow-[0_0_12px_-4px_var(--accent-glow)]"
      title="Your available credits"
    >
      <Sparkles size={13} className="text-[var(--accent)]" />
      <span>{credits.toLocaleString()}</span>
    </div>
  )
}
