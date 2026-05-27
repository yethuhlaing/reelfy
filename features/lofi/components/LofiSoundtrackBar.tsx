'use client'

import { SkipBack, SkipForward, X } from 'lucide-react'
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProgress,
  AudioPlayerTime,
  useAudioPlayer,
} from '@/shared/ui/audio-player'
import {
  useAnimatedWaveformBands,
  useAudioElementAnalyser,
} from '@/shared/hooks/use-audio-element-analyser'
import { cn } from '@/shared/lib/utils'

function MiniLiveBars({ bands }: { bands: number[] }) {
  return (
    <div className="flex h-8 w-24 shrink-0 items-end gap-[2px] overflow-hidden">
      {bands.map((value, i) => (
        <div
          key={i}
          className="w-[3px] shrink-0 rounded-full bg-[var(--accent)] transition-[height] duration-75"
          style={{
            height: `${Math.max(4, value * 32)}px`,
            opacity: 0.5 + value * 0.5,
          }}
        />
      ))}
    </div>
  )
}

export interface LofiSoundtrackBarTrack {
  id: string
  title: string
  src: string
}

export function LofiSoundtrackBar({
  tracks,
  currentIndex,
  onJump,
  onStop,
}: {
  tracks: LofiSoundtrackBarTrack[]
  currentIndex: number
  onJump: (delta: number) => void
  onStop: () => void
}) {
  const { ref, isPlaying } = useAudioPlayer()
  const track = tracks[currentIndex]

  const analyserBands = useAudioElementAnalyser(ref, isPlaying, 7)
  const animatedBands = useAnimatedWaveformBands(isPlaying && !analyserBands, 7)
  const liveBands =
    isPlaying && analyserBands && analyserBands.some((v) => v > 0.08)
      ? analyserBands
      : isPlaying
        ? animatedBands
        : null

  if (!track || currentIndex < 0) return null

  const playerItem = { id: track.id, src: track.src }

  return (
    <div className="fixed bottom-6 left-1/2 z-[700] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] border border-[var(--border)] bg-[var(--surface-solid)] px-[18px] py-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-3 max-md:flex-wrap sm:gap-4">
        <span className="inline-flex shrink-0 whitespace-nowrap rounded-[20px] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]">
          Track {currentIndex + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-[var(--text)]">{track.title}</p>
        </div>

        {liveBands ? (
          <MiniLiveBars bands={liveBands} />
        ) : (
          <div className="flex h-8 w-24 shrink-0 items-end gap-[2px]">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className="w-[3px] flex-1 rounded-full bg-[var(--muted)]"
                style={{ height: `${8 + (i % 3) * 4}px`, opacity: 0.35 }}
              />
            ))}
          </div>
        )}

        <div className="flex min-w-[140px] flex-1 items-center gap-2 max-md:order-last max-md:w-full">
          <AudioPlayerProgress className="flex-1 [&_[data-slot=slider-range]]:bg-[var(--accent)] [&_[data-slot=slider-thumb]]:border-[var(--accent)]" />
          <AudioPlayerTime className="text-xs tabular-nums text-[var(--muted)]" />
          <span className="text-xs text-[var(--muted)]">/</span>
          <AudioPlayerDuration className="text-xs tabular-nums text-[var(--muted)]" />
        </div>

        <button
          type="button"
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onJump(-1)}
          disabled={currentIndex <= 0}
          aria-label="Previous track"
        >
          <SkipBack size={14} />
        </button>

        <AudioPlayerButton
          item={playerItem}
          className={cn(
            'inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border px-2.5 transition',
            'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[var(--surface2)]',
            'ring-2 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]',
            'text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]',
          )}
          size="icon"
          variant="outline"
        />

        <button
          type="button"
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onJump(1)}
          disabled={currentIndex >= tracks.length - 1}
          aria-label="Next track"
        >
          <SkipForward size={14} />
        </button>

        <div className="flex gap-1.5 max-md:hidden">
          {tracks.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition',
                i === currentIndex
                  ? 'scale-110 bg-[var(--accent)]'
                  : i < currentIndex
                    ? 'bg-[var(--muted)]'
                    : 'bg-[var(--border)]',
              )}
            />
          ))}
        </div>

        <button
          type="button"
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-2.5 text-[var(--text)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
          onClick={onStop}
          aria-label="Stop playback"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
