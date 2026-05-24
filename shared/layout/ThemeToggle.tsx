'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const rippleRef = useRef<HTMLButtonElement>(null)
  useEffect(() => setMounted(true), [])
  const current = mounted ? theme : undefined

  const handleClick = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
    // Trigger ripple effect
    if (rippleRef.current) {
      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      rippleRef.current.appendChild(ripple)
      // Remove the ripple after animation ends
      ripple.addEventListener('animationend', () => {
        ripple.remove()
      })
    }
  }

  return (
    <button
      className="relative inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] overflow-hidden"
      aria-label="Theme"
      onClick={handleClick}
      ref={rippleRef}
    >
      {current === 'light' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
