'use client'

import Link from 'next/link'
import { LogOut, Settings, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AvatarMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account"
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-transparent bg-[var(--accent)] p-0 text-[var(--accent-ink)] transition hover:brightness-105"
        >
          Y
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem><User size={14} /> Profile</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings"><Settings size={14} /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem><LogOut size={14} /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
