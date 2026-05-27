'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface VisualAsset {
  id: string
  prompt: string
  model: string
  status: string
  resultUrl: string | null
}

function VisualMedia({ asset, className }: { asset: VisualAsset; className?: string }) {
  const isImage = /flux|gemini|sdxl/.test(asset.model)
  const isReady = asset.status === 'ready' && !!asset.resultUrl

  if (!isReady) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface2)] p-6',
          className,
        )}
      >
        <Loader2 size={22} className="animate-spin text-[var(--accent)] opacity-70" />
        <span className="line-clamp-3 text-center text-[0.75rem] text-[var(--muted)]">
          {asset.prompt}
        </span>
        <span className="text-[0.65rem] capitalize text-[var(--muted)] opacity-60">
          {asset.status}
        </span>
      </div>
    )
  }

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.resultUrl!}
        alt={asset.prompt}
        className={cn('h-full w-full object-contain bg-black/40', className)}
      />
    )
  }

  return (
    <video
      src={asset.resultUrl!}
      muted
      autoPlay
      loop
      playsInline
      className={cn('h-full w-full object-contain bg-black/40', className)}
    />
  )
}

export function VisualGalleryViewer({ assets }: { assets: VisualAsset[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = assets[selectedIndex] ?? assets[0]

  if (!selected) return null

  const goPrev = () => setSelectedIndex((i) => (i > 0 ? i - 1 : assets.length - 1))
  const goNext = () => setSelectedIndex((i) => (i < assets.length - 1 ? i + 1 : 0))

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)]">
        <div className="relative aspect-video w-full">
          <VisualMedia asset={selected} />

          {assets.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/90 backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Previous scene"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/90 backdrop-blur-sm transition hover:bg-black/60"
                aria-label="Next scene"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-3 pt-10">
            <p className="line-clamp-2 text-[0.78rem] leading-snug text-white/90">
              {selected.prompt}
            </p>
            <p className="mt-1 text-[0.65rem] tabular-nums text-white/55">
              Scene {selectedIndex + 1} of {assets.length}
            </p>
          </div>
        </div>
      </div>

      {assets.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {assets.map((asset, index) => {
            const isSelected = index === selectedIndex
            const isReady = asset.status === 'ready' && !!asset.resultUrl

            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'relative aspect-video w-[88px] shrink-0 overflow-hidden rounded-lg border-2 transition sm:w-[104px]',
                  isSelected
                    ? 'border-[var(--accent)] ring-2 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]'
                    : 'border-[var(--border)] opacity-75 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:opacity-100',
                )}
                aria-label={`View scene ${index + 1}`}
                aria-current={isSelected}
              >
                {isReady ? (
                  /flux|gemini|sdxl/.test(asset.model) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.resultUrl!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={asset.resultUrl!}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--surface2)] text-[0.6rem] text-[var(--muted)]">
                    {index + 1}
                  </div>
                )}
                <span
                  className={cn(
                    'absolute left-1 top-1 rounded px-1 py-0.5 text-[0.58rem] font-semibold tabular-nums',
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-black/55 text-white/80',
                  )}
                >
                  {index + 1}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
