'use client'

export type NotificationType =
  | 'scene-animated'
  | 'scene-failed'
  | 'export-done'
  | 'export-failed'
  | 'generation-failed'
  | 'generation-complete'

export interface Notification {
  id: string
  type: NotificationType
  storyId: string
  sceneId?: string
  message: string
  link: string
  createdAt: number
  read: boolean
}

const KEY = 'notifications:v1'
const MAX = 20
type Listener = () => void
const listeners = new Set<Listener>()

function read(): Notification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as Notification[]
  } catch {
    return []
  }
}

function write(items: Notification[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)))
  } catch {
    // quota / unavailable — ignore
  }
  listeners.forEach((l) => l())
}

export const notifications = {
  add(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const item: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
      read: false,
    }
    const next = [item, ...read()]
    write(next)
    return item
  },
  list(): Notification[] {
    return read()
  },
  markRead(id: string): void {
    write(read().map((n) => (n.id === id ? { ...n, read: true } : n)))
  },
  markAllRead(): void {
    write(read().map((n) => ({ ...n, read: true })))
  },
  unreadCount(): number {
    return read().filter((n) => !n.read).length
  },
  clear(): void {
    write([])
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
