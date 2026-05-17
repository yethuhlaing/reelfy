'use client'

import { useEffect, useState } from 'react'
import { notifications, type Notification } from '@/lib/notifications'

export function useNotifications(): { items: Notification[]; unread: number } {
  const [items, setItems] = useState<Notification[]>(() => notifications.list())
  useEffect(() => {
    const unsub = notifications.subscribe(() => setItems(notifications.list()))
    return () => { unsub() }
  }, [])
  return { items, unread: items.filter((n) => !n.read).length }
}
