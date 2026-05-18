'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { CreditsPill } from '../workspace/status/CreditsPill'
import { AvatarMenu } from './AvatarMenu'
import { NotificationBell } from '../notifications/NotificationBell'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'
import { getSessionUser } from '@/lib/auth-session'

interface TopBarProps {
  title?: ReactNode
  right?: ReactNode
}

export function TopBar({ title, right }: TopBarProps) {
  const { data: sessionData, isPending } = useSession()
  const user = getSessionUser(sessionData)
  const isSignedIn = Boolean(user?.id || user?.email)

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-5 py-2.5 backdrop-blur-[10px]">
      <div className="min-w-0 flex-1 truncate font-[var(--font-heading)] text-[0.95rem] font-semibold">{title}</div>
      <div className="flex items-center gap-2">
        {right}
        {isSignedIn && !isPending ? (
          <>
            <NotificationBell />
            <CreditsPill />
            <ThemeToggle />
            <span className="hidden max-w-32 truncate text-sm text-[var(--muted)] md:inline">
              {user?.name || user?.email}
            </span>
            <AvatarMenu user={user} />
          </>
        ) : (
          <>
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
