'use client'

import Link from 'next/link'
import { Plus, Sparkles, Film, Clock } from 'lucide-react'

interface Props {
  category: string
  stats: { stories: number; minutes: number }
}

export function DashboardHero({ category, stats }: Props) {
  return (
    <section className="dash-hero">
      <Link href={`/${category}/new`} className="dash-hero-cta">
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>
            Make
          </div>
          <h2>Start a new story</h2>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
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
    <div className="dash-stat">
      <div className="dash-stat-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {icon} {label}
      </div>
      <div className="dash-stat-value">{value}</div>
    </div>
  )
}
