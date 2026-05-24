'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/shared/hooks/use-notifications'
import { useTabTitle } from '@/shared/hooks/use-tab-title'
import { notifications } from '@/shared/lib/notifications'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function NotificationBell() {
  const { items, unread } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useTabTitle(unread)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => notifications.markAllRead(), 300)
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={14} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-[#ef4444] px-1 py-0.5 text-center text-[0.6rem] leading-none text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-[750] max-h-[420px] w-80 overflow-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {items.length === 0 ? (
            <div className="p-5 text-center text-[0.85rem] text-[var(--muted)]">No recent activity</div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`flex cursor-pointer gap-2.5 border-b border-[var(--border)] px-3 py-2.5 hover:bg-[var(--surface2)] ${!n.read ? 'bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]' : ''}`}
                onClick={() => {
                  notifications.markRead(n.id)
                  setOpen(false)
                  router.push(n.link)
                }}
              >
                <div>
                  <div className="text-[0.82rem] text-[var(--text)]">{n.message}</div>
                  <div className="mt-0.5 text-[0.7rem] text-[var(--muted)]">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
          {items.length > 0 && (
            <div className="border-t border-[var(--border)] px-3 py-2 text-right">
              <button
                className="inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 text-[0.72rem] text-[var(--text)]"
                onClick={() => notifications.clear()}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
