'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isAuthRoute = pathname?.startsWith('/auth/')

  if (isAuthRoute) {
    return <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
  }

  return (
    <div
      className="grid min-h-screen [grid-template-columns:var(--sidebar-w,240px)_1fr] transition-[grid-template-columns] duration-200 ease-out"
      data-collapsed="false"
    >
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
    </div>
  )
}
