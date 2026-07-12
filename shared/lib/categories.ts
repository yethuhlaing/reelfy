import type { LucideIcon } from 'lucide-react'
import { Music2, Laugh } from 'lucide-react'

export type CreateCategoryLink = {
  id: string
  navLabel: string
  icon?: LucideIcon
  glyph?: string
}

/** Available “create” entries shown in the sidebar (routes to /new?category=…) */
export const CREATE_CATEGORY_LINKS: CreateCategoryLink[] = [
  { id: 'stickman', navLabel: 'Animated characters', glyph: '◈' },
  { id: 'brainrot', navLabel: 'Brainrot', glyph: '▶' },
  { id: 'lofi', navLabel: 'Chill music & visuals', icon: Music2 },
  { id: 'lofi-stock', navLabel: 'Stock music & visuals', glyph: '♪' },
  { id: 'meme', navLabel: 'Meme generator', icon: Laugh },
]

/** Sidebar heading above create links — matches /new picker */
export const SIDEBAR_CREATE_TITLE = 'New video'

export function newCategoryHref(id: string): string {
  return `/new?category=${encodeURIComponent(id)}`
}

export function storyHref(id: string, opts?: { starting?: boolean; category?: string }): string {
  const base = `/dashboard/story/${id}`
  const params = new URLSearchParams()
  if (opts?.starting) params.set('starting', '1')
  if (opts?.category) params.set('category', opts.category)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

export function memeHref(id: string): string {
  return `/dashboard/meme/${id}`
}

export function brainrotHref(id: string): string {
  return `/dashboard/brainrot/${id}`
}

export function getCategoryNavLabel(id: string): string {
  return CREATE_CATEGORY_LINKS.find((c) => c.id === id)?.navLabel ?? id
}
