'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const current = mounted ? theme : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="icon-btn" aria-label="Theme">
          {current === 'light' ? <Sun size={14} /> : current === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun size={14} /> Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon size={14} /> Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Monitor size={14} /> System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
