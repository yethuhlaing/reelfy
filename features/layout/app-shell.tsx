'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/features/layout/Sidebar'
import { SidebarProvider } from '@/features/layout/sidebar-context'
import { TopBar } from '@/features/layout/TopBar'
import { Button } from '@/features/ui/button'
import type { SessionUser } from '@/lib/auth-session'

interface AppShellProps {
  children: React.ReactNode
  currentUser: SessionUser | null
}

export function AppShell({ children, currentUser }: AppShellProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAuthRoute = pathname?.startsWith('/auth/')
  const isPublicHomeRoute = pathname === '/'

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

    if (pathname === '/content-generation') {
      return { breadcrumb: [{ label: 'Content Generation' }] }
    }

    const categoryMatch = pathname.match(/^\/([^/]+)\/new$/)
    if (categoryMatch) {
      const category = categoryMatch[1]
      return {
        breadcrumb: [{ label: category, href: `/${category}` }, { label: 'new' }],
      }
    }

    return null
  }

  const topBar = resolveTopBar()

  if (isAuthRoute || isPublicHomeRoute) {
    return <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
  }

  return (
    <SidebarProvider>
      <div
        className="grid min-h-screen [grid-template-columns:var(--sidebar-w,240px)_1fr] transition-[grid-template-columns] duration-200 ease-out"
        data-collapsed="false"
      >
        <Sidebar currentUser={currentUser} />
        <div className="flex min-h-screen min-w-0 flex-col">
          {topBar ? <TopBar {...topBar} currentUser={currentUser} /> : null}
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
