'use client'

import { ChevronLeft, Loader2, ListMusic } from 'lucide-react'
import { PlaylistDurationMeter } from './PlaylistDurationMeter'
import { PlaylistTrackRow } from './PlaylistTrackRow'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

export function StockPlaylistPanel({
  tracks,
  targetDurationSec,
  onRemove,
  onMoveUp,
  onMoveDown,
  onContinue,
  continueDisabled,
  isContinuing,
  continueLabel = 'Continue',
  compact,
  onBack,
}: {
  tracks: FreetouseTrack[]
  targetDurationSec?: number
  onRemove: (id: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onContinue: () => void
  continueDisabled: boolean
  isContinuing?: boolean
  continueLabel?: string
  compact?: boolean
  onBack?: () => void
}) {
  return (
    <div
      className={`flex flex-col gap-3 ${
        compact ? '' : 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden'
      }`}
    >
      <div className={`flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ${compact ? '' : 'lg:flex-1 lg:min-h-0'}`}>
        <div className="flex items-center gap-2">
          <ListMusic size={18} className="text-[var(--accent)]" />
          <h2 className="text-[0.9rem] font-semibold text-[var(--text)]">Your playlist</h2>
          <span className="ml-auto text-[0.72rem] text-[var(--muted)]">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>

        <PlaylistDurationMeter tracks={tracks} targetDurationSec={targetDurationSec} />

        <div className={`flex flex-col gap-1.5 ${compact ? 'max-h-[200px]' : 'min-h-[120px] flex-1 overflow-y-auto'}`}>
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <ListMusic size={28} className="text-[var(--muted)] opacity-50" />
              <p className="text-[0.78rem] text-[var(--muted)]">
                Add tracks from the catalog to build your soundtrack.
              </p>
            </div>
          ) : (
            tracks.map((track, i) => (
              <PlaylistTrackRow
                key={track.id}
                track={track}
                index={i}
                canMoveUp={i > 0}
                canMoveDown={i < tracks.length - 1}
                onRemove={() => onRemove(track.id)}
                onMoveUp={() => onMoveUp(i)}
                onMoveDown={() => onMoveDown(i)}
              />
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              className="inline-flex h-[42px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 text-[0.82rem] font-medium text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
              onClick={onBack}
            >
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            className="inline-flex h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] text-[0.9rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onContinue}
            disabled={continueDisabled || isContinuing}
          >
            {isContinuing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Please wait…
              </>
            ) : (
              continueLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
