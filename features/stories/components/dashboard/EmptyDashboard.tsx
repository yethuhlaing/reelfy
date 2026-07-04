import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { CREATE_CATEGORY_LINKS, newCategoryHref } from '@/shared/lib/categories'

export function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center gap-[18px] rounded-[18px] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-5 py-[60px] text-center">
      <StickmanArt />
      <h3 className="font-[var(--font-heading)] text-2xl">Nothing here yet</h3>
      <p className="max-w-[420px] text-[var(--muted)]">
        Your stories, ambient loops, and saved memes will show up here once you create one.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {CREATE_CATEGORY_LINKS.map((cat) => (
          <Link
            key={cat.id}
            href={newCategoryHref(cat.id)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105"
          >
            <Sparkles size={14} /> {cat.navLabel}
          </Link>
        ))}
      </div>
    </div>
  )
}

function StickmanArt() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="text-[var(--accent)]">
      <circle cx="48" cy="22" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M48 32 V62 M48 40 L30 50 M48 40 L66 50 M48 62 L34 84 M48 62 L62 84"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="14" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="14" cy="40" r="2.5" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}
