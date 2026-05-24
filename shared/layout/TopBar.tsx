'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { CreditsPill } from '@/features/workspace/components/status/CreditsPill'
import { NotificationBell } from '@/shared/layout/NotificationBell'
import { Button } from '@/shared/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb'
import type { SessionUser } from '@/features/auth/server/auth-session'
import { useSidebar } from '@/shared/layout/sidebar-context'

interface Crumb {
  label: string
  href?: string
}

interface TopBarProps {
  title?: ReactNode
  breadcrumb?: Crumb[]
  right?: ReactNode
  currentUser?: SessionUser | null
}

export function TopBar({ title, breadcrumb, right, currentUser = null }: TopBarProps) {
  const user = currentUser
  const isSignedIn = Boolean(user?.id || user?.email)
  const { collapsed, toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-5 py-2.5 backdrop-blur-[10px]">
      <button
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>
      <div className="min-w-0 flex-1 truncate">
        {breadcrumb ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumb.flatMap((item, i) => [
                ...(i > 0 ? [<BreadcrumbSeparator key={`sep-${i}`} />] : []),
                <BreadcrumbItem key={i}>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>,
              ])}
            </BreadcrumbList>
          </Breadcrumb>
        ) : title ? (
          <span className="font-[var(--font-heading)] text-[0.95rem] font-semibold">{title}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {right}
        {isSignedIn ? (
          <>
            <NotificationBell />
            <CreditsPill user={user} />
            <ThemeToggle />
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
