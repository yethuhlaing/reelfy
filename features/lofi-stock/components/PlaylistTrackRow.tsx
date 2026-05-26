'use client'

import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { AudioPlayerButton } from '@/shared/ui/audio-player'
import { formatMmSs, getTrackArtistName } from '@/features/lofi-stock/lib/playlist-utils'
import { TrackArt } from './TrackArt'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function PlaylistTrackRow({
  track,
  index,
  canMoveUp,
  canMoveDown,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  track: FreetouseTrack
  index: number
  canMoveUp: boolean
  canMoveDown: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const artistName = getTrackArtistName(track)
  const durationLabel = formatMmSs(track.duration)
  const playerItem = { id: track.id, src: track.files.mp3, data: track }

  return (
    <div className="group flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]">
      <span className="w-4 shrink-0 text-center text-[0.65rem] font-medium tabular-nums text-[var(--muted)]">
        {index + 1}
      </span>
      <TrackArt src={track.thumbnails.sm} title={track.title} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.78rem] font-medium leading-tight text-[var(--text)]">
          {track.title}
        </p>
        <p className="truncate text-[0.68rem] text-[var(--muted)]">
          {artistName ?? 'Unknown artist'} · {durationLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition group-hover:opacity-100">
        <AudioPlayerButton
          item={playerItem}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface)]"
          size="icon"
          variant="outline"
          aria-label={`Play ${track.title}`}
        />
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] disabled:opacity-30"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={`Move ${track.title} up`}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] disabled:opacity-30"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={`Move ${track.title} down`}
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
          onClick={onRemove}
          aria-label={`Remove ${track.title}`}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
