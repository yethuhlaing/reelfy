'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

const COLLAPSED_KEY = 'sidebar:collapsed'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  setCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    setCollapsedState(localStorage.getItem(COLLAPSED_KEY) === '1')
  }, [])

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v)
    localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0')
    document.documentElement.dataset.sidebarCollapsed = v ? '1' : '0'
    const shell = document.querySelector('[data-collapsed]') as HTMLElement | null
    if (shell) {
      shell.dataset.collapsed = String(v)
      shell.style.setProperty('--sidebar-w', v ? '64px' : '240px')
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
