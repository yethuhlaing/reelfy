import Link from 'next/link'
import { ArrowRight, Music2, PenLine, Layers, Pencil } from 'lucide-react'

const CATEGORIES = [
  {
    id: 'stickman',
    label: 'Stickman',
    tagline: 'Visual storytelling, fast',
    description:
      'Simple characters, expressive scenes, clear narrative arc. Best for founder stories, product explainers, and educational content.',
    status: 'available',
    href: '/stickman/new',
    icon: '◈',
    accent: 'var(--accent)',
    glow: 'var(--accent-glow)',
  },
  {
    id: 'lofi',
    label: 'Lofi',
    tagline: 'Ambient visuals with music',
    description:
      'Lo-fi aesthetics with auto-generated music and calm motion. Perfect for background content, study playlists, and chill brand moments.',
    status: 'available',
    href: '/lofi/new',
    icon: null,
    iconEl: Music2,
    accent: '#4f8ef7',
    glow: 'rgba(79,142,247,0.3)',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    tagline: 'Hand-drawn explainer style',
    description:
      'Animated sketch-on-canvas feel for step-by-step walkthroughs, tutorials, and business breakdowns.',
    status: 'coming_soon',
    href: null,
    icon: null,
    iconEl: PenLine,
    accent: '#64748b',
    glow: 'rgba(100,116,139,0.2)',
  },
  {
    id: 'comic',
    label: 'Comic',
    tagline: 'Panel-based storytelling',
    description:
      'Bold panels, high contrast, dramatic beats. Built for punchy social content, product launches, and narrative sequences.',
    status: 'coming_soon',
    href: null,
    icon: null,
    iconEl: Layers,
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
  },
  {
    id: 'doodle',
    label: 'Doodle',
    tagline: 'Casual sketch energy',
    description:
      'Playful hand-drawn style for social-first short videos, quick ideas, and brand personality moments.',
    status: 'coming_soon',
    href: null,
    icon: null,
    iconEl: Pencil,
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.25)',
  },
]

export default function NewPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">New video</p>
        <h1 className="font-[var(--font-heading)] text-4xl font-bold leading-tight tracking-tight text-[var(--text)]">
          Pick your style
        </h1>
        <p className="max-w-xl text-[var(--muted)]">
          Each category is a different visual language. Choose one, shape your story.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const IconEl = cat.iconEl ?? null
          const available = cat.status === 'available'

          const card = (
            <article
              key={cat.id}
              style={
                available
                  ? {
                      '--cat-accent': cat.accent,
                      '--cat-glow': cat.glow,
                    } as React.CSSProperties
                  : undefined
              }
              className={[
                'group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-200',
                available
                  ? 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--cat-accent)] hover:shadow-[0_0_20px_var(--cat-glow)] cursor-pointer'
                  : 'border-[var(--border)] bg-[var(--surface)] opacity-50 cursor-not-allowed select-none',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base transition-colors"
                  style={{
                    background: available ? `${cat.glow ?? 'rgba(255,255,255,0.06)'}` : 'rgba(255,255,255,0.04)',
                    color: available ? cat.accent : 'var(--muted)',
                  }}
                >
                  {cat.icon ? (
                    <span className="font-bold">{cat.icon}</span>
                  ) : IconEl ? (
                    <IconEl size={17} />
                  ) : null}
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none"
                  style={
                    available
                      ? { borderColor: cat.accent, color: cat.accent, background: cat.glow }
                      : { borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }
                  }
                >
                  {available ? 'Available' : 'Coming soon'}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">{cat.label}</h2>
                <p className="text-xs font-medium text-[var(--muted)]">{cat.tagline}</p>
              </div>

              <p className="text-sm leading-relaxed text-[var(--muted)]">{cat.description}</p>

              {available && (
                <div className="mt-auto pt-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                    style={{ background: cat.accent }}
                  >
                    Start creating <ArrowRight size={13} />
                  </span>
                </div>
              )}
            </article>
          )

          return available && cat.href ? (
            <Link key={cat.id} href={cat.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={cat.id}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
