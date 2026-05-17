'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { PanelLeftClose, PanelLeftOpen, Plus, Settings, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVE_CAT_KEY = 'category:active'
const COLLAPSED_KEY = 'sidebar:collapsed'
const DEFAULT_CATEGORY = 'stickman'

interface Category { id: string; label: string; icon: string; soon?: boolean }
const CATEGORIES: Category[] = [
  { id: 'stickman', label: 'Stickman', icon: '◈' },
  { id: 'whiteboard', label: 'Whiteboard', icon: '▱', soon: true },
  { id: 'comic', label: 'Comic', icon: '▢', soon: true },
  { id: 'doodle', label: 'Doodle', icon: '✎', soon: true },
]

export function Sidebar() {
  const params = useParams<{ category?: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY)

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    const stored = localStorage.getItem(ACTIVE_CAT_KEY)
    if (stored) setActiveCategory(stored)
  }, [])

  useEffect(() => {
    if (params?.category && typeof params.category === 'string') {
      setActiveCategory(params.category)
      localStorage.setItem(ACTIVE_CAT_KEY, params.category)
    }
  }, [params?.category])

  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = collapsed ? '1' : '0'
    const shell = document.querySelector('[data-collapsed]') as HTMLElement | null
    if (shell) {
      shell.dataset.collapsed = collapsed ? 'true' : 'false'
      shell.style.setProperty('--sidebar-w', collapsed ? '64px' : '240px')
    }
  }, [collapsed])

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const goNew = () => router.push(`/${activeCategory}/new`)
  const onDashboard = pathname === '/dashboard'

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-2 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-2.5 py-3.5">
      <div className={cn('flex items-center gap-2.5 px-2.5 pb-3.5', collapsed && 'justify-center')}>
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent)] font-[var(--font-heading)] text-[var(--accent-ink)] font-bold">
          ◈
        </div>
        {!collapsed && <div className="font-[var(--font-heading)] text-[1.05rem] font-bold tracking-[-0.01em]">StickStory</div>}
        <button
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]',
            collapsed ? '' : 'ml-auto',
          )}
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <button
        className={cn(
          'inline-flex items-center gap-2 rounded-[10px] bg-[var(--accent)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--accent-ink)] transition active:translate-y-px hover:brightness-105',
          collapsed && 'justify-center px-2.5',
        )}
        onClick={goNew}
        title="New story"
      >
        <Plus size={16} />
        {!collapsed && <span>New Story</span>}
      </button>

      <Link
        href="/dashboard"
        className={cn(
          'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
          onDashboard && 'bg-[var(--surface2)] text-[var(--accent)]',
          collapsed && 'justify-center px-2',
        )}
      >
        <LayoutDashboard size={16} />
        {!collapsed && <span>Dashboard</span>}
      </Link>

      {!collapsed && (
        <div className="px-3 pb-1 pt-3.5 text-[0.68rem] uppercase tracking-[0.08em] text-[var(--muted)]">Categories</div>
      )}
      {CATEGORIES.map((c) => {
        const isActive = !c.soon && c.id === activeCategory && !onDashboard
        if (c.soon) {
          return (
            <div
              key={c.id}
              className={cn(
                'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--muted)]',
                collapsed && 'justify-center px-2',
              )}
              title="Coming soon"
            >
              <span style={{ width: 16, textAlign: 'center' }}>{c.icon}</span>
              {!collapsed && <span>{c.label}</span>}
              {!collapsed && (
                <span className="ml-auto rounded-full border border-[var(--border)] px-1.5 py-px text-[0.62rem] text-[var(--muted)]">
                  soon
                </span>
              )}
            </div>
          )
        }
        return (
          <button
            key={c.id}
            className={cn(
              'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
              isActive && 'bg-[var(--surface2)] text-[var(--accent)]',
              collapsed && 'justify-center px-2',
            )}
            onClick={() => {
              setActiveCategory(c.id)
              localStorage.setItem(ACTIVE_CAT_KEY, c.id)
              router.push('/dashboard')
            }}
          >
            <span style={{ width: 16, textAlign: 'center' }}>{c.icon}</span>
            {!collapsed && <span>{c.label}</span>}
          </button>
        )
      })}

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
    </aside>
  )
}

export function useActiveCategory(): string {
  const params = useParams<{ category?: string }>()
  const [cat, setCat] = useState(DEFAULT_CATEGORY)
  useEffect(() => {
    if (params?.category && typeof params.category === 'string') {
      setCat(params.category)
      return
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_CAT_KEY) : null
    if (stored) setCat(stored)
  }, [params?.category])
  return cat
}
