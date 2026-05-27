import Link from 'next/link'
import { ArrowRight, Music2, PenLine, Layers, Pencil } from 'lucide-react'
import { DecorativeBackground } from '@/shared/ui/decorative-background'

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
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <DecorativeBackground />

      <div className="relative z-20 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            ✦ AI CREATIVE STUDIO · NEW VIDEO
          </p>
          <h1 className="font-[var(--font-heading)] text-5xl font-black leading-[0.95] tracking-tight text-foreground md:text-6xl">
            Pick your{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--accent-hover)] to-[var(--coral-light)] bg-clip-text text-transparent">
              style
            </span>
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground md:text-base">
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
                    ? ({
                        '--cat-accent': cat.accent,
                        '--cat-glow': cat.glow,
                      } as React.CSSProperties)
                    : undefined
                }
                className={[
                  'group relative flex h-full flex-col gap-3 overflow-hidden rounded-[20px] border border-white/30 bg-white/[0.27] p-5 backdrop-blur-[40px] backdrop-saturate-150',
                  'shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.1),inset_0_0_16px_8px_rgba(255,255,255,0.25)]',
                  'before:pointer-events-none before:absolute before:left-0 before:right-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent',
                  'after:pointer-events-none after:absolute after:left-0 after:top-0 after:h-full after:w-px after:bg-gradient-to-b after:from-white/80 after:via-transparent after:to-white/30',
                  'transition-all duration-300',
                  available
                    ? 'cursor-pointer hover:-translate-y-1 hover:border-[var(--cat-accent)] hover:shadow-[0_20px_60px_-10px_var(--cat-glow),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_0_24px_8px_rgba(255,255,255,0.3)]'
                    : 'cursor-not-allowed select-none opacity-50',
                ].join(' ')}
              >
                {available && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--surface2)] to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] text-base transition-colors"
                    style={{
                      background: available ? cat.glow : 'var(--surface)',
                      color: available ? cat.accent : 'var(--muted)',
                      boxShadow: available ? `0 0 20px ${cat.glow}` : 'none',
                    }}
                  >
                    {cat.icon ? (
                      <span className="font-bold">{cat.icon}</span>
                    ) : IconEl ? (
                      <IconEl size={17} />
                    ) : null}
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest"
                    style={
                      available
                        ? { borderColor: cat.accent, color: cat.accent, background: cat.glow }
                        : { borderColor: 'var(--border)', color: 'var(--muted)', background: 'transparent' }
                    }
                  >
                    {available ? '● Live' : 'Soon'}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="font-[var(--font-heading)] text-xl font-bold text-foreground">{cat.label}</h2>
                  <p className="text-xs font-medium text-muted-foreground">{cat.tagline}</p>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{cat.description}</p>

                {available && (
                  <div className="mt-auto pt-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm font-semibold transition group-hover:gap-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${cat.accent}, ${cat.accent}cc)`,
                        color: cat.id === 'stickman' ? 'var(--accent-ink)' : '#fff',
                      }}
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
    </div>
  )
}
