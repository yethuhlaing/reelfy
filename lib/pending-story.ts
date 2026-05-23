import type { GenerateOptions } from '@/lib/types'

const PENDING_PREFIX = 'stickman:pending:'

export interface PendingStory {
  id: string
  category: string
  storyInput: string
  options: GenerateOptions
  createdAt: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function savePendingStory(p: PendingStory): void {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(PENDING_PREFIX + p.id, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export function getPendingStory(id: string): PendingStory | null {
  if (!isBrowser()) return null
  try {
    const raw = sessionStorage.getItem(PENDING_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as PendingStory
  } catch {
    return null
  }
}

export function clearPendingStory(id: string): void {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(PENDING_PREFIX + id)
  } catch {
    /* ignore */
  }
}
