import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const VIEWPORT_IMAGES = [
  { src: '/images/3.png', top: '4%', left: '-2%', w: 280, h: 360, rotate: -6, opacity: 0.85, blur: 0 },
  { src: '/images/2.png', top: '8%', right: '-2%', w: 260, h: 340, rotate: 5, opacity: 0.8, blur: 0 },
  { src: '/images/5.png', bottom: '6%', left: '-3%', w: 320, h: 400, rotate: 4, opacity: 0.85, blur: 0 },
  { src: '/images/7.png', bottom: '4%', right: '-3%', w: 300, h: 380, rotate: -5, opacity: 0.85, blur: 0 },
  { src: '/images/4.png', top: '38%', right: '8%', w: 180, h: 240, rotate: 10, opacity: 0.55, blur: 1 },
  { src: '/images/1.png', top: '46%', left: '6%', w: 170, h: 220, rotate: -10, opacity: 0.55, blur: 1 },
]

/** Framed around the form — sits on the sides, fades toward center so inputs stay clear */
const AROUND_FORM_IMAGES = [
  {
    src: '/transparent/1.png',
    className: 'top-[4%] left-[-6%] w-[min(26vw,210px)] md:left-[-2%]',
    rotate: -10,
    opacity: 0.82,
  },
  {
    src: '/transparent/2.png',
    className: 'top-[6%] right-[-6%] w-[min(26vw,210px)] md:right-[-2%]',
    rotate: 9,
    opacity: 0.78,
  },
  {
    src: '/transparent/3.png',
    className: 'top-[38%] left-[-12%] w-[min(22vw,185px)] -translate-y-1/2 md:left-[-4%]',
    rotate: -6,
    opacity: 0.7,
  },
  {
    src: '/transparent/4.png',
    className: 'top-[40%] right-[-12%] w-[min(22vw,185px)] -translate-y-1/2 md:right-[-4%]',
    rotate: 7,
    opacity: 0.7,
  },
  {
    src: '/transparent/5.png',
    className: 'bottom-[6%] left-[-4%] w-[min(28vw,230px)] md:left-[2%]',
    rotate: 5,
    opacity: 0.75,
  },
] as const

interface DecorativeBackgroundProps {
  showFloatingChrome?: boolean
  /** `viewport` = corners of the page; `around-form` = flanks the centered form */
  imageLayout?: 'viewport' | 'around-form'
  children?: React.ReactNode
}

function AmbientLayers() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 35%, var(--accent-glow) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 15% 90%, rgba(79,142,247,0.20) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 90%, var(--coral-glow) 0%, transparent 65%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="new-blob new-blob-b" />
        <div className="new-blob new-blob-c" />
      </div>
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
    </>
  )
}

function ViewportFloatingImages() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      {VIEWPORT_IMAGES.map((img, i) => (
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
  )
}

function FormEdgeImages() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden md:block"
      style={{
        maskImage:
          'radial-gradient(ellipse 52% 58% at 50% 48%, transparent 42%, black 78%)',
        WebkitMaskImage:
          'radial-gradient(ellipse 52% 58% at 50% 48%, transparent 42%, black 78%)',
      }}
    >
      {AROUND_FORM_IMAGES.map((img, i) => (
        <div
          key={img.src}
          className={cn('absolute', img.className)}
          style={{
            opacity: img.opacity,
            animation: `floatY ${8 + i * 1.1}s ease-in-out ${i * 0.55}s infinite alternate`,
          }}
        >
          <Image
            src={img.src}
            alt=""
            width={400}
            height={520}
            className="h-auto w-full select-none drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
            style={{
              transform: `rotate(${img.rotate}deg)`,
            }}
            draggable={false}
            priority={i < 2}
          />
        </div>
      ))}
    </div>
  )
}

function FloatingChrome() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-[8%] top-[22%] z-10 hidden w-[260px] xl:block"
      style={{ animation: 'floatY 7s ease-in-out infinite alternate' }}
    >
      <div className="relative -rotate-[6deg] rounded-2xl border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] p-3 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <Sparkles size={10} className="text-[var(--accent)]" /> Prompt
        </div>
        <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 py-2.5 text-[11px] text-muted-foreground">
          a calm cat sipping coffee at dawn…
        </div>
        <div className="mt-2 flex justify-end">
          <div className="h-6 w-6 rounded-lg bg-[var(--accent)] shadow-[0_0_16px_var(--accent-glow)]" />
        </div>
      </div>
    </div>
  )
}

export function DecorativeBackground({
  showFloatingChrome = true,
  imageLayout = 'viewport',
  children,
}: DecorativeBackgroundProps) {
  if (imageLayout === 'around-form') {
    return (
      <div className="relative flex w-full flex-1 flex-col">
        <AmbientLayers />
        <div className="relative z-10 flex flex-1 items-start justify-center px-2 py-6 md:px-4 md:py-8">
          <div className="relative w-full max-w-6xl">
            <FormEdgeImages />
            <div className="relative z-20">{children}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AmbientLayers />
      <ViewportFloatingImages />
      {showFloatingChrome ? <FloatingChrome /> : null}
      {children}
    </>
  )
}
