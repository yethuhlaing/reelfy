'use client'

import { ChevronDown, ChevronUp, X, type LucideIcon } from 'lucide-react'
import {
  AudioPlayerButton,
  useAudioPlayer,
  useAudioPlayerTime,
} from '@/shared/ui/audio-player'
import {
  useAnimatedWaveformBands,
  useAudioElementAnalyser,
} from '@/shared/hooks/use-audio-element-analyser'
import { formatMmSs } from '@/features/lofi-stock/lib/playlist-utils'
import { sampleWaveformBars, syntheticWaveform } from '@/features/lofi/lib/synthetic-waveform'
import { cn } from '@/shared/lib/utils'

const BAR_COUNT = 48

function StaticWaveformBars({
  bars,
  maxBar,
  progress = 0,
  highlighted = false,
}: {
  bars: number[]
  maxBar: number
  progress?: number
  highlighted?: boolean
}) {
  const playedThrough = Math.floor(progress * bars.length)

  return (
    <div className="flex h-8 items-end gap-[1px] overflow-hidden">
      {bars.map((value, i) => {
        const isPlayed = i <= playedThrough
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-[1px] transition-colors duration-150',
              isPlayed || highlighted ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]',
            )}
            style={{
              height: `${Math.max(14, (value / maxBar) * 100)}%`,
              opacity: isPlayed ? 0.95 : highlighted ? 0.55 : 0.35,
            }}
          />
        )
      })}
    </div>
  )
}

function LiveWaveformBars({ bands }: { bands: number[] }) {
  return (
    <div className="flex h-8 items-end gap-[1px] overflow-hidden">
      {bands.map((value, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] bg-[var(--accent)] transition-[height] duration-75"
          style={{
            height: `${Math.max(14, value * 100)}%`,
            opacity: 0.55 + value * 0.45,
          }}
        />
      ))}
    </div>
  )
}

export interface SoundtrackWaveformRowProps {
  id: string
  title: string
  durationSec: number
  src: string | null
  waveform?: number[]
  index: number
  isReady?: boolean
  statusLabel?: string
  highlighted?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onRemove?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  /** When true, row shows static waveform only; floating bar handles live playback UI */
  compactPlayback?: boolean
}

export function SoundtrackWaveformRow({
  id,
  title,
  durationSec,
  src,
  waveform,
  index,
  isReady = true,
  statusLabel,
  highlighted = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp = false,
  canMoveDown = false,
  compactPlayback = false,
}: SoundtrackWaveformRowProps) {
  const { ref, isItemActive, isPlaying, duration, play } = useAudioPlayer()
  const time = useAudioPlayerTime()
  const isTrackActive = isItemActive(id)
  const isTrackPlaying = isTrackActive && isPlaying
  const useInlineVisualizer = !compactPlayback && isTrackPlaying

  const analyserBands = useAudioElementAnalyser(ref, useInlineVisualizer, BAR_COUNT)
  const animatedBands = useAnimatedWaveformBands(
    useInlineVisualizer && !analyserBands,
    BAR_COUNT,
  )

  const resolvedWaveform =
    waveform && waveform.length > 0 ? waveform : syntheticWaveform(`${id}:${title}`)
  const bars = sampleWaveformBars(resolvedWaveform, BAR_COUNT)
  const maxBar = Math.max(...bars, 1)
  const progress =
    isTrackActive && duration && Number.isFinite(duration) && duration > 0
      ? time / duration
      : 0

  const liveBands =
    !compactPlayback &&
    (isTrackPlaying && analyserBands && analyserBands.some((v) => v > 0.08)
      ? analyserBands
      : isTrackPlaying
        ? animatedBands
        : null)

  const showControls = onMoveUp || onMoveDown || onRemove

  const handleRowPlay = () => {
    if (isReady && src) void play({ id, src })
  }

  return (
    <div
      role={isReady && src ? 'button' : undefined}
      tabIndex={isReady && src ? 0 : undefined}
      onClick={isReady && src ? handleRowPlay : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isReady && src) {
          e.preventDefault()
          handleRowPlay()
        }
      }}
      className={cn(
        'group rounded-xl border px-3 py-2.5 transition',
        isReady && src && 'cursor-pointer',
        isTrackActive
          ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))]'
          : highlighted
            ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--surface))]'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 w-4 shrink-0 text-center text-[0.65rem] font-medium tabular-nums text-[var(--muted)]">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[0.8rem] font-medium leading-tight text-[var(--text)]">
              {title}
            </p>
            <span className="shrink-0 text-[0.68rem] tabular-nums text-[var(--muted)]">
              {formatMmSs(durationSec)}
            </span>
          </div>

          <div className="mt-2">
            {liveBands ? (
              <LiveWaveformBars bands={liveBands} />
            ) : (
              <StaticWaveformBars
                bars={bars}
                maxBar={maxBar}
                progress={isTrackActive ? progress : 0}
                highlighted={isTrackActive}
              />
            )}
          </div>

          {!isReady && statusLabel && (
            <p className="mt-1 text-[0.68rem] capitalize text-[var(--muted)]">{statusLabel}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {isReady && src ? (
            <AudioPlayerButton
              item={{ id, src }}
              aria-label={`Play ${title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface)]"
              size="icon"
              variant="outline"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}

          {showControls && (
            <>
              <IconButton
                icon={ChevronUp}
                label="Move up"
                onClick={onMoveUp}
                disabled={!canMoveUp}
              />
              <IconButton
                icon={ChevronDown}
                label="Move down"
                onClick={onMoveDown}
                disabled={!canMoveDown}
              />
              <IconButton icon={X} label="Remove" onClick={onRemove} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  if (!onClick) return null

  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] disabled:opacity-30"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon size={14} />
    </button>
  )
}
