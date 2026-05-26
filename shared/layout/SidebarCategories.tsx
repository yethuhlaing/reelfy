'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import {
  CREATE_CATEGORY_LINKS,
  SIDEBAR_CREATE_TITLE,
  newCategoryHref,
  type CreateCategoryLink,
} from '@/shared/lib/categories'

function CategoryIcon({ category }: { category: CreateCategoryLink }) {
  const Icon = category.icon
  if (Icon) return <Icon size={16} />
  if (category.glyph) {
    return <span className="text-[0.85rem] font-bold leading-none">{category.glyph}</span>
  }
  return <span className="h-4 w-4 rounded-sm bg-[var(--surface2)]" />
}

export function SidebarCategories({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed ? (
        <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--muted)]">
          {SIDEBAR_CREATE_TITLE}
        </p>
      ) : (
        <div className="mx-2 mb-1 border-t border-[var(--border)]" title={SIDEBAR_CREATE_TITLE} />
      )}
      <nav className="flex flex-col gap-0.5">
        {CREATE_CATEGORY_LINKS.map((category) => {
          const href = newCategoryHref(category.id)
          const active = pathname === href

          return (
            <Link
              key={category.id}
              href={href}
              title={category.navLabel}
              className={cn(
                'inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]',
                active && 'bg-[var(--surface2)] text-[var(--accent)]',
                collapsed && 'justify-center px-2',
              )}
            >
              <CategoryIcon category={category} />
              {!collapsed && <span>{category.navLabel}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
