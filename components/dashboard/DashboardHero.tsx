'use client'

import Link from 'next/link'
import { Plus, Sparkles, Film, Clock } from 'lucide-react'

interface Props {
  stats: { stories: number; minutes: number }
}

export function DashboardHero({ stats }: Props) {
  return (
    <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <Link
        href="/new-story"
        className="flex flex-col justify-between gap-[18px] rounded-2xl border-0 bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_60%,#fff))] p-[22px] text-left font-[var(--font-body)] text-[var(--accent-ink)] transition hover:-translate-y-0.5"
      >
        <div>
          <div className="text-xs uppercase tracking-[0.08em] opacity-70">
            Make
          </div>
          <h2 className="font-[var(--font-heading)] text-[1.6rem] leading-[1.1]">Start a new story</h2>
        </div>
        <div className="inline-flex items-center gap-2 font-semibold">
          <Plus size={18} /> New Story
        </div>
      </Link>

      <Stat icon={<Film size={14} />} label="Stories" value={stats.stories} />
      <Stat icon={<Sparkles size={14} />} label="Credits used" value="—" />
      <Stat icon={<Clock size={14} />} label="Minutes generated" value={stats.minutes} />
    </section>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-[18px]">
      <div className="inline-flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.06em] text-[var(--muted)]">
        {icon} {label}
      </div>
      <div className="font-[var(--font-heading)] text-[1.8rem] font-bold">{value}</div>
    </div>
  )
}
