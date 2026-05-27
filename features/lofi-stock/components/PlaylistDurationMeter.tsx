'use client'

import {
  formatMmSs,
  getPlaylistOverTargetMessage,
  sumTrackDurationSec,
} from '@/features/lofi-stock/lib/playlist-utils'
import { TrackArt } from './TrackArt'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

const PREVIEW_ART_COUNT = 5

export function PlaylistDurationMeter({
  tracks,
  targetDurationSec,
}: {
  tracks: FreetouseTrack[]
  targetDurationSec?: number
}) {
  const selectedSec = sumTrackDurationSec(tracks)
  const selectedLabel = formatMmSs(selectedSec)
  const previewTracks = tracks.slice(0, PREVIEW_ART_COUNT)
  const overflow = tracks.length - previewTracks.length

  const artStrip = tracks.length > 0 && (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {previewTracks.map((track) => (
          <div
            key={track.id}
            className="ring-2 ring-[var(--surface)] rounded-md"
          >
            <TrackArt src={track.thumbnails.sm} title={track.title} size="sm" />
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span className="text-[0.68rem] font-medium text-[var(--muted)]">
          +{overflow}
        </span>
      )}
    </div>
  )

  if (targetDurationSec == null) {
    return (
      <div className="flex flex-col gap-2.5" aria-live="polite">
        {artStrip}
        <p className="text-[0.8rem] text-[var(--muted)]">
          <span className="font-semibold text-[var(--text)]">{selectedLabel}</span>
          {' '}total
          {tracks.length > 0 && (
            <span> · {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
          )}
        </p>
      </div>
    )
  }

  const targetLabel = formatMmSs(targetDurationSec)
  const overTargetMessage = getPlaylistOverTargetMessage(tracks, targetDurationSec)
  const overTarget = overTargetMessage != null
  const underTarget = selectedSec < targetDurationSec
  const progress = targetDurationSec > 0
    ? Math.min(100, (selectedSec / targetDurationSec) * 100)
    : 0

  return (
    <div className="flex flex-col gap-2.5">
      {artStrip}
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[0.8rem] font-medium ${overTarget ? 'text-red-500' : 'text-[var(--text)]'}`}>
          {selectedLabel} / {targetLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(selectedSec)}
        aria-valuemin={0}
        aria-valuemax={targetDurationSec}
        aria-label={`Playlist duration ${selectedLabel} of ${targetLabel}`}
        className="h-1.5 overflow-hidden rounded-full bg-[var(--surface2)]"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            overTarget ? 'bg-red-500' : 'bg-[var(--accent)]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {tracks.length > 0 && (
        <p className={`text-[0.72rem] leading-snug ${overTarget ? 'text-red-500' : 'text-[var(--muted)]'}`}>
          {overTarget
            ? overTargetMessage
            : underTarget
              ? 'Tracks will loop to fill the video length you chose.'
              : 'Matches your video length.'}
        </p>
      )}
    </div>
  )
}
