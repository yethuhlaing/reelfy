'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Settings, LayoutDashboard, ChartNoAxesCombined, Shield, LogOut } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { signOut } from '@/features/auth/server/auth-client'
import type { SessionUser } from '@/features/auth/server/auth-session'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { useSidebar } from '@/shared/layout/sidebar-context'
import { usePathname } from 'next/navigation'
import { SidebarCategories } from '@/shared/layout/SidebarCategories'

interface SidebarProps {
  currentUser: SessionUser | null
}

export function Sidebar({ currentUser }: SidebarProps) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()
  const user = currentUser
  const isAdmin = user?.role === 'admin'
  const [isSigningOut, setIsSigningOut] = useState(false)

  const name = user?.name || user?.email || 'Account'
  const initials = name.slice(0, 1).toUpperCase()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = '/auth/login'
          },
        },
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-2 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-2.5 py-3.5">
      <div className={cn('flex items-center gap-2.5 px-2.5 pb-3.5', collapsed && 'justify-center')}>
        <Link
          href="/dashboard"
          className={cn('inline-flex items-center gap-2.5', collapsed && 'justify-center')}
          title="Dashboard"
        >
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] font-[var(--font-heading)] text-[var(--accent-ink)] font-bold">
            ◈
          </div>
          {!collapsed && <div className="font-[var(--font-heading)] text-[1.05rem] font-bold tracking-[-0.01em]">StickStory</div>}
        </Link>
      </div>

      <Link
        href="/dashboard"
        className={cn(
          'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
          pathname === '/dashboard' && 'bg-[var(--surface2)] text-[var(--accent)]',
          collapsed && 'justify-center px-2',
        )}
      >
        <LayoutDashboard size={16} />
        {!collapsed && <span>Dashboard</span>}
      </Link>

      <SidebarCategories collapsed={collapsed} />

      <div className={cn('border-t border-[var(--border)]', collapsed ? 'mx-1' : 'mx-2')} />

      <Link
        href="/usage"
        className={cn(
          'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
          pathname === '/usage' && 'bg-[var(--surface2)] text-[var(--accent)]',
          collapsed && 'justify-center px-2',
        )}
      >
        <ChartNoAxesCombined size={16} />
        {!collapsed && <span>Usage & Billing</span>}
      </Link>

      {isAdmin ? (
        <Link
          href="/admin"
          className={cn(
            'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
            pathname.startsWith('/admin') && 'bg-[var(--surface2)] text-[var(--accent)]',
            collapsed && 'justify-center px-2',
          )}
        >
          <Shield size={16} />
          {!collapsed && <span>Admin</span>}
        </Link>
      ) : null}

      <Link
        href="/settings"
        className={cn(
          'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
          pathname === '/settings' && 'bg-[var(--surface2)] text-[var(--accent)]',
          collapsed && 'justify-center px-2',
        )}
      >
        <Settings size={16} />
        {!collapsed && <span>Settings</span>}
      </Link>

      {/* Spacer to push avatar to bottom */}
      <div className="flex-1" />

      {/* Avatar section at bottom right */}
      {user ? (
        <div className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2', collapsed && 'justify-center')}>
          <button
            aria-label="Account"
            className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-transparent bg-[var(--accent)] p-0 text-[var(--accent-ink)] transition hover:brightness-105"
            onClick={() => {}}
          >
            <Avatar className="size-[34px]">
              <AvatarImage src={user.image ?? undefined} alt={name} />
              <AvatarFallback className="bg-[var(--accent)] text-[var(--accent-ink)]">{initials}</AvatarFallback>
            </Avatar>
          </button>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--text)]">{name}</div>
                <div className="truncate text-xs text-[var(--muted)]">{user.email}</div>
              </div>
              <button
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)] transition hover:text-[var(--danger)] hover:bg-[var(--surface2)]"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      ) : null}
    </aside>
  )
}

