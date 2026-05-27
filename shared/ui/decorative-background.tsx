import { Sparkles } from 'lucide-react'

const FLOATING_IMAGES = [
  { src: '/images/3.png', top: '4%', left: '-2%', w: 280, h: 360, rotate: -6, opacity: 0.85, blur: 0 },
  { src: '/images/2.png', top: '8%', right: '-2%', w: 260, h: 340, rotate: 5, opacity: 0.8, blur: 0 },
  { src: '/images/5.png', bottom: '6%', left: '-3%', w: 320, h: 400, rotate: 4, opacity: 0.85, blur: 0 },
  { src: '/images/7.png', bottom: '4%', right: '-3%', w: 300, h: 380, rotate: -5, opacity: 0.85, blur: 0 },
  { src: '/images/4.png', top: '38%', right: '8%', w: 180, h: 240, rotate: 10, opacity: 0.55, blur: 1 },
  { src: '/images/1.png', top: '46%', left: '6%', w: 170, h: 220, rotate: -10, opacity: 0.55, blur: 1 },
]

interface DecorativeBackgroundProps {
  showFloatingChrome?: boolean
}

export function DecorativeBackground({ showFloatingChrome = true }: DecorativeBackgroundProps) {
  return (
    <>
      {/* Layer 0: Radial ambient gradient */}
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

      {/* Layer 2: Grid pattern overlay */}
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

      {/* Layer 3: Floating decorative portraits */}
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
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.35) 100%)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {showFloatingChrome && (
        <>
          {/* Layer 4: Glass mini-prompt-box (top-right) */}
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

          {/* Layer 5: Glass tag chip (bottom-left) */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[14%] left-[6%] z-10 hidden xl:block"
            style={{ animation: 'floatY 9s ease-in-out 1s infinite alternate' }}
          >
            <div className="inline-block rotate-[5deg] rounded-full border border-[var(--border-strong)] bg-[var(--surface2)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
              ◉ Gen · AI · 2026
            </div>
          </div>
        </>
      )}
    </>
  )
}
