'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/use-notifications'
import { useTabTitle } from '@/hooks/use-tab-title'
import { notifications } from '@/lib/notifications'

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
    <div className="notif-wrap" ref={ref}>
      <button className="icon-btn" aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        <Bell size={14} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          {items.length === 0 ? (
            <div className="notif-empty">No recent activity</div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`notif-row${!n.read ? ' unread' : ''}`}
                onClick={() => {
                  notifications.markRead(n.id)
                  setOpen(false)
                  router.push(n.link)
                }}
              >
                <div>
                  <div className="notif-row__msg">{n.message}</div>
                  <div className="notif-row__time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
          {items.length > 0 && (
            <div className="notif-footer">
              <button
                className="icon-btn"
                style={{ height: 24, padding: '0 8px', fontSize: '0.72rem' }}
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
