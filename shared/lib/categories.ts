import type { LucideIcon } from 'lucide-react'
import { Music2 } from 'lucide-react'

export type CreateCategoryLink = {
  id: string
  navLabel: string
  icon?: LucideIcon
  glyph?: string
}

/** Available “create” entries shown in the sidebar (routes to /new?category=…) */
export const CREATE_CATEGORY_LINKS: CreateCategoryLink[] = [
  { id: 'stickman', navLabel: 'Animated characters', glyph: '◈' },
  { id: 'lofi', navLabel: 'Chill music & visuals', icon: Music2 },
  { id: 'lofi-stock', navLabel: 'Stock music & visuals', glyph: '♪' },
]

/** Sidebar heading above create links — matches /new picker */
export const SIDEBAR_CREATE_TITLE = 'New video'

export function newCategoryHref(id: string): string {
  return `/new?category=${encodeURIComponent(id)}`
}

export function storyHref(id: string, opts?: { starting?: boolean }): string {
  const base = `/dashboard/story/${id}`
  return opts?.starting ? `${base}?starting=1` : base
}

export function getCategoryNavLabel(id: string): string {
  return CREATE_CATEGORY_LINKS.find((c) => c.id === id)?.navLabel ?? id
}
