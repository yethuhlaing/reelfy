import Link from 'next/link'
import { ArrowRight, Music2, PenLine, Layers, Pencil, Sparkles } from 'lucide-react'

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

// Decorative floating images — bigger, bolder, framed editorial-style
const FLOATING_IMAGES = [
  { src: '/images/3.png', top: '4%', left: '-2%', w: 280, h: 360, rotate: -6, opacity: 0.85, blur: 0 },
  { src: '/images/2.png', top: '8%', right: '-2%', w: 260, h: 340, rotate: 5, opacity: 0.8, blur: 0 },
  { src: '/images/5.png', bottom: '6%', left: '-3%', w: 320, h: 400, rotate: 4, opacity: 0.85, blur: 0 },
  { src: '/images/7.png', bottom: '4%', right: '-3%', w: 300, h: 380, rotate: -5, opacity: 0.85, blur: 0 },
  { src: '/images/4.png', top: '38%', right: '8%', w: 180, h: 240, rotate: 10, opacity: 0.55, blur: 1 },
  { src: '/images/1.png', top: '46%', left: '6%', w: 170, h: 220, rotate: -10, opacity: 0.55, blur: 1 },
]

export default function NewPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Layer 0: Radial ambient gradient — uses transparent stops so works on both light/dark bg */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 35%, var(--accent-glow) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 15% 90%, rgba(79,142,247,0.20) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 90%, var(--coral-glow) 0%, transparent 65%)',
        }}
      />

      {/* Layer 1: Animated mesh blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="new-blob new-blob-a" />
        <div className="new-blob new-blob-b" />
        <div className="new-blob new-blob-c" />
      </div>

      {/* Layer 2: Grid pattern overlay — uses currentColor for theme-aware */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%)',
        }}
      />

      {/* Layer 3: Floating decorative portraits — bigger, framed editorial */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        {FLOATING_IMAGES.map((img, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: img.top,
              left: img.left,
              right: img.right,
              bottom: img.bottom,
              width: img.w,
              height: img.h,
              opacity: img.opacity,
              animation: `floatY ${9 + i * 1.2}s ease-in-out ${i * 0.6}s infinite alternate`,
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[20px] border border-[var(--border-strong)] bg-[var(--surface)]"
              style={{
                transform: `rotate(${img.rotate}deg)`,
                backgroundImage: `url('${img.src}')`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                filter: img.blur ? `blur(${img.blur}px) saturate(1.15)` : 'saturate(1.15)',
                boxShadow:
                  '0 40px 100px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              {/* Inner film grain + subtle vignette */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.35) 100%)',
                }}
              />
              {/* Corner label tag */}
              <div className="absolute left-2 top-2 rounded-md border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-white/80 backdrop-blur-md">
                ◉ {String(i + 1).padStart(2, '0')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Layer 4: Decorative floating glass mini-prompt-box (top-right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[8%] top-[22%] z-10 hidden w-[260px] xl:block"
        style={{ animation: 'floatY 7s ease-in-out infinite alternate' }}
      >
        <div className="relative -rotate-[6deg] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface2)] p-3 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles size={10} className="text-[var(--accent)]" /> Prompt
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[11px] text-muted-foreground">
            a calm cat sipping coffee at dawn…
          </div>
          <div className="mt-2 flex justify-end">
            <div className="h-6 w-6 rounded-lg bg-[var(--accent)] shadow-[0_0_16px_var(--accent-glow)]" />
          </div>
        </div>
      </div>

      {/* Layer 5: Decorative floating glass tag (bottom-left) */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[14%] left-[6%] z-10 hidden xl:block"
        style={{ animation: 'floatY 9s ease-in-out 1s infinite alternate' }}
      >
        <div className="inline-block rotate-[5deg] rounded-full border border-[var(--border-strong)] bg-[var(--surface2)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          ◉ Gen · AI · 2026
        </div>
      </div>

      {/* MAIN CONTENT */}
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
                  'group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300',
                  available
                    ? 'cursor-pointer border-[var(--border)] bg-[var(--surface)] hover:-translate-y-1 hover:border-[var(--cat-accent)] hover:bg-[var(--surface2)] hover:shadow-[0_0_40px_var(--cat-glow)]'
                    : 'cursor-not-allowed select-none border-[var(--border)] bg-[var(--surface)] opacity-50',
                ].join(' ')}
              >
                {/* Card shine gradient sweep on hover */}
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
