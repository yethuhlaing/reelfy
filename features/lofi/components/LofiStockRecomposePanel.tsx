'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Plus, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useSoundtrackPlayback } from '@/features/lofi/hooks/use-soundtrack-playback'
import { LofiPromptList } from './LofiPromptList'
import { LofiSoundtrackBar } from './LofiSoundtrackBar'
import { SoundtrackWaveformRow } from './SoundtrackWaveformRow'
import { StockTrackBrowser } from '@/features/lofi-stock/components/StockTrackBrowser'
import { fetchTrackWaveformsAction } from '@/features/lofi-stock/actions/browse-tracks'
import { calcVisualDuration } from '@/features/lofi/lib/visual-duration'
import { DEFAULT_TEXT_MODEL } from '@/shared/lib/text-model-options'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import type { VisualMode, VisualAsset } from '@/shared/lib/types'
import type { FreetouseTrack } from '@/shared/lib/providers/audio/music-freetouse'

interface TrackItem {
  playerId: string
  freetouseId: string
  title: string
  durationSec: number
  mp3Url: string | null
  waveform?: number[]
}

interface AssetStub {
  id: string
  kind: string
  prompt: string
  durationSec: number
  resultUrl: string | null
  sourceTrackId?: string | null
}

interface Props {
  videoId: string
  isStock: boolean
  assets: AssetStub[]
  vibe: string
  targetDurationSec: number
  visualMode: string
  visualModel: string
  musicModel: string
  onRecomposed: () => void
}

function RecomposePanelInner({
  videoId,
  isStock,
  assets,
  vibe,
  targetDurationSec,
  visualMode,
  visualModel,
  musicModel,
  onRecomposed,
}: Props) {
  const stockAssets = assets.filter((a) => a.kind === 'music' || a.kind === 'stock-music')
  const visualAssets = assets.filter((a) => a.kind === 'visual')

  const [tracks, setTracks] = useState<TrackItem[]>(() =>
    stockAssets.map((a) => ({
      playerId: a.id,
      freetouseId: a.sourceTrackId ?? a.id,
      title: a.prompt,
      durationSec: a.durationSec,
      mp3Url: a.resultUrl,
    })),
  )
  const [visualPrompts, setVisualPrompts] = useState<string[]>(() =>
    visualAssets.map((a) => a.prompt),
  )
  const [showBrowser, setShowBrowser] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const playableTracks = useMemo(
    () =>
      tracks
        .filter((t) => t.mp3Url)
        .map((t) => ({
          id: t.playerId,
          title: t.title,
          src: t.mp3Url!,
        })),
    [tracks],
  )

  const { currentIndex, showBar, jump, handleStop } = useSoundtrackPlayback(playableTracks)

  const stockSourceIdKey = useMemo(
    () =>
      assets
        .filter((a) => a.kind === 'music' || a.kind === 'stock-music')
        .map((a) => a.sourceTrackId)
        .filter((id): id is string => !!id)
        .join(','),
    [assets],
  )

  useEffect(() => {
    if (!stockSourceIdKey) return
    const ids = stockSourceIdKey.split(',')

    let cancelled = false
    fetchTrackWaveformsAction(ids).then((data) => {
      if (cancelled) return
      setTracks((prev) => {
        const next = prev.map((track) => {
          const waveform = data[track.freetouseId]
          if (!waveform?.length || track.waveform?.length) return track
          return { ...track, waveform }
        })
        return next.every((t, i) => t === prev[i]) ? prev : next
      })
    })

    return () => {
      cancelled = true
    }
  }, [stockSourceIdKey])

  const isTrackSelected = useCallback(
    (id: string) => tracks.some((t) => t.freetouseId === id),
    [tracks],
  )

  const toggleTrack = useCallback((track: FreetouseTrack) => {
    setTracks((prev) => {
      const exists = prev.some((t) => t.freetouseId === track.id)
      if (exists) return prev.filter((t) => t.freetouseId !== track.id)
      return [
        ...prev,
        {
          playerId: track.id,
          freetouseId: track.id,
          title: track.title,
          durationSec: track.duration,
          mp3Url: track.files.mp3,
          waveform: track.waveform,
        },
      ]
    })
  }, [])

  const moveTrack = (index: number, dir: -1 | 1) => {
    setTracks((prev) => {
      const next = [...prev]
      const newIdx = index + dir
      if (newIdx < 0 || newIdx >= next.length) return prev
      ;[next[index], next[newIdx]] = [next[newIdx], next[index]]
      return next
    })
  }

  const handleRegenerateVisual = async (index: number) => {
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe,
          targetDurationSec,
          textModel: DEFAULT_TEXT_MODEL,
          targetVisualCount: 1,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed')
      }
      const result = await res.json() as { visualPrompts: string[] }
      setVisualPrompts((prev) => {
        const updated = [...prev]
        updated[index] = result.visualPrompts[0] ?? prev[index]
        return updated
      })
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not regenerate prompt.'))
    }
  }

  const handleAddVisual = async () => {
    const insertIndex = visualPrompts.length
    setVisualPrompts((prev) => [...prev, ''])
    try {
      const res = await fetch('/api/lofi/expand-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibe,
          targetDurationSec,
          textModel: DEFAULT_TEXT_MODEL,
          targetVisualCount: 1,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const result = await res.json() as { visualPrompts: string[] }
      setVisualPrompts((prev) => {
        const updated = [...prev]
        updated[insertIndex] = result.visualPrompts[0] ?? ''
        return updated
      })
    } catch (err) {
      setVisualPrompts((prev) => prev.filter((_, i) => i !== insertIndex))
      toast.error(toUserErrorMessage(err, 'Could not add prompt.'))
    }
  }

  const handleRecompose = async () => {
    if (isStock && tracks.length === 0) {
      toast.error('Add at least one track.')
      return
    }
    if (visualPrompts.length === 0) {
      toast.error('Add at least one visual prompt.')
      return
    }

    setSubmitting(true)
    try {
      const mode = visualMode as VisualMode
      const visualAssets: VisualAsset[] = visualPrompts.map((prompt, i) => ({
        prompt,
        durationSec: calcVisualDuration(i, mode, visualPrompts.length, targetDurationSec),
      }))

      const selectedTracks = tracks.map((t) => ({
        id: t.freetouseId,
        title: t.title,
        mp3Url: t.mp3Url ?? '',
        duration_sec: t.durationSec,
      }))

      const res = await fetch(`/api/lofi/videos/${videoId}/recompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedTracks: isStock ? selectedTracks : undefined,
          visualPrompts,
          visualConfig: { mode, model: visualModel, assets: visualAssets },
          musicModel,
          musicLoopCount: isStock ? tracks.length : 0,
          isStock,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Recompose failed')
      }

      toast.success('Recomposing video…')
      onRecomposed()
    } catch (err) {
      toast.error(toUserErrorMessage(err, 'Could not recompose. Try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card-gradient-border glass overflow-hidden rounded-2xl border border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <SlidersHorizontal size={15} className="text-[var(--accent)]" />
        <h2 className="text-[0.78rem] font-semibold uppercase tracking-wider text-[var(--text)]">
          Edit &amp; Recompose
        </h2>
        <span className="ml-auto text-[0.68rem] text-[var(--muted)]">
          Adjust tracks or scenes, then regenerate
        </span>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-2">
        {isStock && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.8rem] font-semibold text-[var(--text)]">
                Soundtrack
                <span className="ml-1.5 font-normal text-[var(--muted)]">({tracks.length})</span>
              </span>
            </div>

            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
              {tracks.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-[0.75rem] text-[var(--muted)]">
                  No tracks selected. Browse below to add tracks.
                </p>
              )}
              {tracks.map((track, i) => (
                <SoundtrackWaveformRow
                  key={track.playerId}
                  id={track.playerId}
                  title={track.title}
                  durationSec={track.durationSec}
                  src={track.mp3Url}
                  waveform={track.waveform}
                  index={i}
                  onRemove={() => setTracks((prev) => prev.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveTrack(i, -1)}
                  onMoveDown={() => moveTrack(i, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < tracks.length - 1}
                />
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[0.72rem] font-medium text-[var(--muted)]">
                  Browse catalog
                </span>
                <button
                  type="button"
                  className="flex shrink-0 cursor-pointer items-center gap-1 text-[0.72rem] text-[var(--accent)] hover:underline"
                  onClick={() => setShowBrowser((v) => !v)}
                >
                  <Plus size={12} />
                  {showBrowser ? 'Hide catalog' : 'Show catalog'}
                </button>
              </div>
              {showBrowser ? (
                <StockTrackBrowser
                  isTrackSelected={isTrackSelected}
                  onToggleTrack={toggleTrack}
                />
              ) : (
                <p className="text-[0.72rem] text-[var(--muted)]">
                  Open the catalog to add or swap tracks without leaving this page.
                </p>
              )}
            </div>
          </div>
        )}

        <div className={`flex flex-col gap-3 ${isStock ? '' : 'lg:col-span-2'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[0.8rem] font-semibold text-[var(--text)]">
              Scene prompts
              <span className="ml-1.5 font-normal text-[var(--muted)]">
                ({visualPrompts.length})
              </span>
            </span>
            <button
              type="button"
              className="ml-auto flex cursor-pointer items-center gap-1 text-[0.72rem] text-[var(--accent)] hover:underline"
              onClick={async () => {
                try {
                  const res = await fetch('/api/lofi/expand-prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      vibe,
                      targetDurationSec,
                      textModel: DEFAULT_TEXT_MODEL,
                      targetVisualCount: visualPrompts.length || 4,
                    }),
                  })
                  if (!res.ok) throw new Error('Failed')
                  const result = (await res.json()) as { visualPrompts: string[] }
                  setVisualPrompts(result.visualPrompts)
                } catch (err) {
                  toast.error(toUserErrorMessage(err, 'Could not regenerate.'))
                }
              }}
            >
              <RefreshCw size={12} /> Regenerate all
            </button>
          </div>
          <LofiPromptList
            prompts={visualPrompts}
            onChange={(i, v) =>
              setVisualPrompts((prev) => {
                const updated = [...prev]
                updated[i] = v
                return updated
              })
            }
            onRegenerate={handleRegenerateVisual}
            onRemove={(i) => setVisualPrompts((prev) => prev.filter((_, idx) => idx !== i))}
            onAdd={visualPrompts.length < 12 ? handleAddVisual : undefined}
          />
        </div>
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <button
          type="button"
          className="inline-flex h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-transparent bg-[var(--accent)] text-[0.9rem] font-semibold text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={handleRecompose}
          disabled={submitting || (isStock && tracks.length === 0) || visualPrompts.length === 0}
        >
          {submitting ? 'Starting…' : 'Recompose video'}
        </button>
      </div>

      {showBar && (
        <LofiSoundtrackBar
          tracks={playableTracks}
          currentIndex={currentIndex}
          onJump={jump}
          onStop={handleStop}
        />
      )}
    </section>
  )
}

export function LofiStockRecomposePanel(props: Props) {
  return <RecomposePanelInner {...props} />
}
