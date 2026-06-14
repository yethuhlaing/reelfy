'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/shared/layout/Sidebar'
import { SidebarProvider } from '@/shared/layout/sidebar-context'
import { TopBar } from '@/shared/layout/TopBar'
import { Button } from '@/shared/ui/button'
import type { SessionUser } from '@/features/auth/server/auth-session'
import type { Dictionary } from '@/i18n/get-dictionary'
import type { Locale } from '@/i18n/config'
import { LocaleProvider, useLocale } from '@/shared/providers/locale-provider'

interface AppShellProps {
  children: React.ReactNode
  currentUser: SessionUser | null
  locale: Locale
  dictionary: Dictionary
}

function DashboardShell({
  children,
  currentUser,
}: {
  children: React.ReactNode
  currentUser: SessionUser | null
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useLocale()

  const resolveTopBar = () => {
    if (!pathname) return null

    if (pathname === '/dashboard') {
      return { breadcrumb: [{ label: t('nav.dashboard') }] }
    }

    if (pathname === '/usage') {
      return {
        breadcrumb: [{ label: t('nav.usageAndBilling') }],
        right: (
          <Button asChild size="sm">
            <Link href="/pricing">{t('nav.buyCredits')}</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/admin') {
      return {
        breadcrumb: [{ label: t('nav.adminDashboard') }],
        right: (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/users">{t('nav.viewAllUsers')}</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/admin/users') {
      const state = searchParams.get('state')
      return {
        title: state === 'unprofitable' ? t('nav.unprofitableUsers') : t('nav.userSpend'),
        right: (
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">{t('nav.backToAdmin')}</Link>
          </Button>
        ),
      }
    }

    if (pathname === '/settings') {
      return { breadcrumb: [{ label: t('nav.settings') }] }
    }

    if (pathname === '/new') {
      return { breadcrumb: [{ label: t('common.new') }] }
    }

    if (pathname.startsWith('/dashboard/story/')) {
      return {
        breadcrumb: [{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('nav.story') }],
      }
    }

    return null
  }

  const topBar = resolveTopBar()

  return (
    <SidebarProvider>
      <div
        className="grid min-h-screen [grid-template-columns:var(--sidebar-w,240px)_1fr] transition-[grid-template-columns] duration-200 ease-out"
        data-collapsed="false"
      >
        <Sidebar currentUser={currentUser} />
        <div className="relative z-30 flex min-h-screen min-w-0 flex-col">
          <TopBar {...(topBar ?? {})} currentUser={currentUser} />
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}

export function AppShell({ children, currentUser, locale, dictionary }: AppShellProps) {
  const pathname = usePathname()
  const isAuthRoute = pathname?.startsWith('/auth/')
  const isWaitlistRoute = pathname === '/waitlist'
  const isPublicHomeRoute = pathname === '/'

  if (isAuthRoute || isWaitlistRoute || isPublicHomeRoute) {
    return <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
  }

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <DashboardShell currentUser={currentUser}>{children}</DashboardShell>
    </LocaleProvider>
  )
}
