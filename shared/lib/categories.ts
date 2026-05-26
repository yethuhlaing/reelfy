import type { LucideIcon } from 'lucide-react'
import { Music2 } from 'lucide-react'

export type CreateCategoryLink = {
  id: string
  navLabel: string
  icon?: LucideIcon
  glyph?: string
}

/** Available “create” entries shown in the sidebar (routes to /[id]/new) */
export const CREATE_CATEGORY_LINKS: CreateCategoryLink[] = [
  { id: 'stickman', navLabel: 'Animated characters', glyph: '◈' },
  { id: 'lofi', navLabel: 'Chill music & visuals', icon: Music2 },
  { id: 'lofi-stock', navLabel: 'Stock music & visuals', glyph: '♪' },
]

/** Sidebar heading above create links — matches /new picker */
export const SIDEBAR_CREATE_TITLE = 'New video'

export function newCategoryHref(id: string): string {
  return `/${id}/new`
}

export function getCategoryNavLabel(id: string): string {
  return CREATE_CATEGORY_LINKS.find((c) => c.id === id)?.navLabel ?? id
}
