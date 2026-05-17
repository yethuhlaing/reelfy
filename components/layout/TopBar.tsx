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
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-right">
        {right}
        <NotificationBell />
        <CreditsPill />
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  )
}
