'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CreditCard, LogOut, Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu'
import { signOut } from '@/lib/auth-client'
import { getUserCredits, type SessionUser } from '@/lib/auth-session'

interface AvatarMenuProps {
  user: SessionUser | null
}

export function AvatarMenu({ user }: AvatarMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!user) return null

  const name = user.name || user.email || 'Account'
  const initials = name.slice(0, 1).toUpperCase()
  const credits = getUserCredits(user)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = '/auth/login'
          },
        },
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account"
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full border border-transparent bg-[var(--accent)] p-0 text-[var(--accent-ink)] transition hover:brightness-105"
        >
          <Avatar className="size-[34px]">
            <AvatarImage src={user.image ?? undefined} alt={name} />
            <AvatarFallback className="bg-[var(--accent)] text-[var(--accent-ink)]">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate">{name}</div>
          {user.email ? <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings size={14} />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <CreditCard size={14} />
          Credits: {credits.toLocaleString()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()} disabled={isSigningOut}>
          <LogOut size={14} />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
