'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface ConnectedAccount {
  id: string
  provider: string
  connectedAt: number
}

interface SettingsPanelProps {
  initialProfile: {
    name: string
    email: string
    image: string
  }
  credits: number
  connectedAccounts: ConnectedAccount[]
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})

export function SettingsPanel({ initialProfile, credits, connectedAccounts }: SettingsPanelProps) {
  const [name, setName] = useState(initialProfile.name)
  const [image, setImage] = useState(initialProfile.image)
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const displayName = name.trim() || initialProfile.email || 'User'
  const initials = displayName.slice(0, 1).toUpperCase()

  const handleSave = async () => {
    setIsSaving(true)
    setSaveState('idle')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          image: image.trim() || null,
        }),
      })
      if (!res.ok) {
        throw new Error('Save failed')
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <div>
        <h2 className="font-[var(--font-heading)] text-[1.15rem]">Settings</h2>
        <p className="mt-0.5 text-[0.85rem] text-[var(--muted)]">Manage your profile, credits, and linked accounts.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name and avatar URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={image || undefined} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">{initialProfile.email}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-avatar">Avatar URL</Label>
              <Input
                id="settings-avatar"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : null}
                {isSaving ? 'Saving...' : 'Save profile'}
              </Button>
              {saveState === 'saved' ? (
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 size={14} />
                  Saved
                </span>
              ) : null}
              {saveState === 'error' ? <span className="text-sm text-red-600">Could not save changes.</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credit balance</CardTitle>
            <CardDescription>Current available generation credits.</CardDescription>
            <CardAction>
              <Button asChild size="sm">
                <Link href="/pricing">Buy credits</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="font-[var(--font-mono)] text-3xl font-semibold tabular-nums">{credits.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">Credits are deducted when scenes are generated.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>OAuth providers linked to this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectedAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connected OAuth accounts found.</p>
          ) : (
            connectedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                <div>
                  <p className="font-medium capitalize">{account.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    Connected {dateFormatter.format(new Date(account.connectedAt))}
                  </p>
                </div>
                <Badge variant="outline">Connected</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}
