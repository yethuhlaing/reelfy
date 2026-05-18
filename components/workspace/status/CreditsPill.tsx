'use client'

import { Sparkles } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { getSessionUser, getUserCredits } from '@/lib/auth-session'

export function CreditsPill() {
  const { data: sessionData } = useSession()
  const user = getSessionUser(sessionData)
  const credits = getUserCredits(user)

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[var(--text)]"
      title="Your available credits"
    >
      <Sparkles size={12} />
      <span>{credits.toLocaleString()}</span>
    </div>
  )
}
