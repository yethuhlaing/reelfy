'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { PanelLeftClose, PanelLeftOpen, Plus, Settings, LayoutDashboard, Sparkles } from 'lucide-react'

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
    const shell = document.querySelector('.shell') as HTMLElement | null
    if (shell) shell.dataset.collapsed = collapsed ? 'true' : 'false'
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
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">◈</div>
        <div className="sidebar-brand-name sidebar-collapsible">StickStory</div>
        <button
          className="icon-btn sidebar-toggle"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <button className="sidebar-cta" onClick={goNew} title="New story">
        <Plus size={16} />
        <span className="sidebar-collapsible">New Story</span>
      </button>

      <Link
        href="/dashboard"
        className={`sidebar-nav-item ${onDashboard ? 'active' : ''}`}
      >
        <LayoutDashboard size={16} />
        <span className="sidebar-collapsible">Dashboard</span>
      </Link>

      <div className="sidebar-section-label">Categories</div>
      {CATEGORIES.map((c) => {
        const isActive = !c.soon && c.id === activeCategory && !onDashboard
        if (c.soon) {
          return (
            <div key={c.id} className="sidebar-nav-item disabled" title="Coming soon">
              <span style={{ width: 16, textAlign: 'center' }}>{c.icon}</span>
              <span className="sidebar-collapsible">{c.label}</span>
              <span className="pill sidebar-collapsible">soon</span>
            </div>
          )
        }
        return (
          <button
            key={c.id}
            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(c.id)
              localStorage.setItem(ACTIVE_CAT_KEY, c.id)
              router.push('/dashboard')
            }}
          >
            <span style={{ width: 16, textAlign: 'center' }}>{c.icon}</span>
            <span className="sidebar-collapsible">{c.label}</span>
          </button>
        )
      })}

      <Link href="/settings" className={`sidebar-nav-item ${pathname === '/settings' ? 'active' : ''}`}>
        <Settings size={16} />
        <span className="sidebar-collapsible">Settings</span>
      </Link>

      <div className="sidebar-footer">
        <div className="sidebar-nav-item" title="Credits — coming soon">
          <Sparkles size={16} />
          <span className="sidebar-collapsible">— credits</span>
        </div>
      </div>
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
