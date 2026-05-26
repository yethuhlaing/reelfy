'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { LofiCostPreview } from '@/features/lofi/components/LofiCostPreview'
import { DURATION_OPTIONS, VISUAL_MODEL_OPTIONS } from '@/features/lofi/lib/pricing-constants'
import {
  formatMmSs,
  getTrackArtistName,
  sumTrackDurationSec,
} from '@/features/lofi-stock/lib/playlist-utils'
import type { ExpandResult } from '@/features/lofi-stock/lib/expand-types'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

const PLAYLIST_PREVIEW_COUNT = 5

export function StockReviewStep({
  expandResult,
  selectedTracks,
  duration,
  visualModel,
  visualPromptCount,
  balance,
  onEditPlaylist,
  onGenerate,
  isSubmitting,
}: {
  expandResult: ExpandResult
  selectedTracks: FreetouseTrack[]
  duration: number
  visualModel: string
  visualPromptCount: number
  balance: number | null
  onEditPlaylist: () => void
  onGenerate: () => void
  isSubmitting: boolean
}) {
  const durationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label
    ?? `${Math.round(duration / 60)} min`
  const visualModelLabel = VISUAL_MODEL_OPTIONS.find((m) => m.value === visualModel)?.label ?? visualModel
  const totalPlaylistSec = sumTrackDurationSec(selectedTracks)
  const previewTracks = selectedTracks.slice(0, PLAYLIST_PREVIEW_COUNT)
  const remaining = selectedTracks.length - previewTracks.length

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-[1rem] font-semibold text-[var(--text)]">
          {expandResult.suggestedTitle}
        </h2>
        <dl className="mt-3 grid gap-2 text-[0.78rem]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Video length</dt>
            <dd className="text-[var(--text)]">{durationLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Playlist</dt>
            <dd className="text-[var(--text)]">
              {selectedTracks.length} tracks · {formatMmSs(totalPlaylistSec)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Visuals</dt>
            <dd className="text-right text-[var(--text)]">
              {expandResult.visualMode} · {visualModelLabel} · {visualPromptCount} scenes
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.75rem] font-medium text-[var(--muted)]">Soundtrack order</span>
            <button
              type="button"
              className="text-[0.72rem] text-[var(--accent)] hover:underline"
              onClick={onEditPlaylist}
            >
              Edit playlist
            </button>
          </div>
          <ol className="flex flex-col gap-1">
            {previewTracks.map((track, i) => {
              const artist = getTrackArtistName(track)
              return (
                <li
                  key={track.id}
                  className="truncate text-[0.75rem] text-[var(--text)]"
                >
                  {i + 1}. {track.title}
                  {artist ? ` — ${artist}` : ''}
                  <span className="text-[var(--muted)]"> ({formatMmSs(track.duration)})</span>
                </li>
              )
            })}
          </ol>
          {remaining > 0 && (
            <p className="mt-1 text-[0.72rem] text-[var(--muted)]">
              and {remaining} more…
            </p>
          )}
        </div>
      </div>

      <LofiCostPreview
        musicModel="freetouse"
        musicLoopCount={selectedTracks.length}
        visualModel={visualModel}
        visualAssetCount={visualPromptCount}
        balance={balance}
      />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-[0.75rem] text-[var(--muted)]">
        Music from{' '}
        <a
          href="https://freetouse.com/music"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--text)]"
        >
          Free To Use (freetouse.com)
        </a>
        {' '}— free for personal use, commercial use requires a{' '}
        <a
          href="https://freetouse.com/music/plans"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--text)]"
        >
          paid license
        </a>.
      </div>

      <button
        type="button"
        className="inline-flex h-[46px] w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[var(--accent)] text-[0.95rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        onClick={onGenerate}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate video
          </>
        )}
      </button>
    </div>
  )
}
