'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/shared/layout/Sidebar'
import { SidebarProvider } from '@/shared/layout/sidebar-context'
import { TopBar } from '@/shared/layout/TopBar'
import { Button } from '@/shared/ui/button'
import type { SessionUser } from '@/features/auth/server/auth-session'
import { isPublicLocalePath } from '@/i18n/locale-path'

interface AppShellProps {
  children: React.ReactNode
  currentUser: SessionUser | null
}

export function AppShell({ children, currentUser }: AppShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAuthRoute = pathname?.startsWith('/auth/')
  const isPublicLocaleRoute = pathname ? isPublicLocalePath(pathname) : false

  const resolveTopBar = () => {
    if (!pathname) return null

    if (pathname === '/dashboard') {
      return { breadcrumb: [{ label: 'Dashboard' }] }
    }

    if (pathname === '/usage') {
      return {
        breadcrumb: [{ label: 'Usage & Billing' }],
        right: (
          <Button asChild size="sm">
            <Link href="/pricing">Buy credits</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/admin') {
      return {
        breadcrumb: [{ label: 'Admin Dashboard' }],
        right: (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">View all users</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/admin/users') {
      const state = searchParams.get('state')
      return {
        title: state === 'unprofitable' ? 'Unprofitable Users' : 'User Spend',
        right: (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Back to admin</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/settings') {
      return { breadcrumb: [{ label: 'Settings' }] }
    }

    if (pathname === '/new') {
      return { breadcrumb: [{ label: 'New' }] }
    }

    if (pathname.startsWith('/dashboard/story/')) {
      return {
        breadcrumb: [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Story' }],
      }
    }

    return null
  }

  const topBar = resolveTopBar()

  if (isAuthRoute || isPublicLocaleRoute) {
    return <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
  }

  return (
    <SidebarProvider>
      <div
        className="grid min-h-screen [grid-template-columns:var(--sidebar-w,240px)_1fr] transition-[grid-template-columns] duration-200 ease-out"
        data-collapsed="false"
      >
        <Sidebar currentUser={currentUser} />
        <div className="relative z-30 flex min-h-screen min-w-0 flex-col">
          {topBar ? <TopBar {...topBar} currentUser={currentUser} /> : null}
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
