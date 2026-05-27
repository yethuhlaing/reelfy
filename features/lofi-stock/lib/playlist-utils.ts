import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function formatMmSs(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function sumTrackDurationSec(tracks: Pick<FreetouseTrack, 'duration'>[]): number {
  return tracks.reduce((sum, t) => sum + t.duration, 0)
}

export function getPlaylistOverTargetMessage(
  tracks: Pick<FreetouseTrack, 'duration'>[],
  targetDurationSec: number,
): string | null {
  const selectedSec = sumTrackDurationSec(tracks)
  if (selectedSec <= targetDurationSec) return null
  const overSec = selectedSec - targetDurationSec
  return `Playlist is ${formatMmSs(overSec)} longer than your ${formatMmSs(targetDurationSec)} video. Remove tracks or increase duration.`
}

export function getTrackArtistName(track: FreetouseTrack): string | undefined {
  const artistEntry = track.artists[0] as [number, { name: string }] | undefined
  return artistEntry?.[1]?.name
}

export function getTrackCategoryName(track: FreetouseTrack): string | undefined {
  const categoryEntry = track.categories[0] as [number, { name: string }] | undefined
  return categoryEntry?.[1]?.name
}
