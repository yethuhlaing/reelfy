'use client'

import { AudioPlayerButton, useAudioPlayer } from '@/shared/ui/audio-player'
import {
  useAudioElementAnalyser,
  useAnimatedWaveformBands,
} from '@/shared/hooks/use-audio-element-analyser'
import {
  formatMmSs,
  getTrackArtistName,
  getTrackCategoryName,
} from '@/features/lofi-stock/lib/playlist-utils'
import { TrackArt } from './TrackArt'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

const BAR_COUNT = 48

export function StockTrackCard({
  track,
  isSelected,
  onToggle,
}: {
  track: FreetouseTrack
  isSelected: boolean
  onToggle: () => void
}) {
  const { ref, isItemActive, isPlaying } = useAudioPlayer()
  const isActive = isItemActive(track.id)
  const isTrackPlaying = isActive && isPlaying

  const analyserBands = useAudioElementAnalyser(ref, isTrackPlaying, BAR_COUNT)
  const animatedBands = useAnimatedWaveformBands(isTrackPlaying && !analyserBands, BAR_COUNT)
  const liveBands =
    isTrackPlaying && analyserBands && analyserBands.some((v) => v > 0.08)
      ? analyserBands
      : isTrackPlaying
        ? animatedBands
        : null

  const playerItem = { id: track.id, src: track.files.mp3, data: track }
  const artistName = getTrackArtistName(track)
  const categoryName = getTrackCategoryName(track)
  const durationStr = formatMmSs(track.duration)

  const waveform = track.waveform
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const idx = Math.floor((i / BAR_COUNT) * waveform.length)
    return waveform[idx] ?? 0
  })
  const maxBar = Math.max(...bars, 1)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        isSelected
          ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]'
          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
      }`}
    >
      <TrackArt src={track.thumbnails.sm} title={track.title} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.85rem] font-medium text-[var(--text)]">
            {track.title}
          </span>
          {isSelected && (
            <span className="shrink-0 rounded border border-[var(--accent)] bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] text-[var(--accent-ink)]">
              In playlist
            </span>
          )}
          {categoryName && !isSelected && (
            <span className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-[0.65rem] text-[var(--muted)]">
              {categoryName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-[var(--muted)]">
          {artistName && <span>{artistName}</span>}
          <span>{durationStr}</span>
          <span>{track.downloads.toLocaleString()} downloads</span>
        </div>

        <div className="flex h-4 items-end gap-[1px] overflow-hidden">
          {(liveBands ?? bars).map((value, i) => {
            const normalised = liveBands ? value : value / maxBar
            return (
              <div
                key={i}
                className={`flex-1 rounded-[1px] ${liveBands ? 'bg-[var(--accent)] transition-[height] duration-75' : isSelected ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'}`}
                style={{
                  height: `${Math.max(8, normalised * 100)}%`,
                  opacity: liveBands ? 0.55 + normalised * 0.45 : 0.35,
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AudioPlayerButton
          item={playerItem}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]"
          size="icon"
          variant="outline"
        />
        <button
          type="button"
          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[0.75rem] font-medium transition ${
            isSelected
              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)]'
          }`}
          onClick={onToggle}
        >
          {isSelected ? '✓ Added' : 'Add'}
        </button>
      </div>
    </div>
  )
}
