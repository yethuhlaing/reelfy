'use client'

import { StockTrackCard } from './StockTrackCard'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function StockTrackList({
  tracks,
  isTrackSelected,
  onToggleTrack,
}: {
  tracks: FreetouseTrack[]
  isTrackSelected: (id: string) => boolean
  onToggleTrack: (track: FreetouseTrack) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {tracks.map((track) => (
        <StockTrackCard
          key={track.id}
          track={track}
          isSelected={isTrackSelected(track.id)}
          onToggle={() => onToggleTrack(track)}
        />
      ))}
    </div>
  )
}
