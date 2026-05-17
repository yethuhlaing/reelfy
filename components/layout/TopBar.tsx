'use client'

import { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { CreditsPill } from '../workspace/status/CreditsPill'
import { AvatarMenu } from './AvatarMenu'
import { NotificationBell } from '../notifications/NotificationBell'

interface TopBarProps {
  title?: ReactNode
  right?: ReactNode
}

export function TopBar({ title, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-5 py-2.5 backdrop-blur-[10px]">
      <div className="min-w-0 flex-1 truncate font-[var(--font-heading)] text-[0.95rem] font-semibold">{title}</div>
      <div className="flex items-center gap-2">
        {right}
        <NotificationBell />
        <CreditsPill />
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  )
}
