'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchTrackWaveformsAction } from '@/features/lofi-stock/actions/browse-tracks'
import { useSoundtrackPlayback } from '@/features/lofi/hooks/use-soundtrack-playback'
import { cn } from '@/shared/lib/utils'
import { LofiSoundtrackBar } from './LofiSoundtrackBar'
import { SoundtrackWaveformRow } from './SoundtrackWaveformRow'

export interface SoundtrackAsset {
  id: string
  prompt: string
  durationSec: number
  status: string
  resultUrl: string | null
  sourceTrackId?: string | null
}

export function SoundtrackPanel({ assets }: { assets: SoundtrackAsset[] }) {
  const [waveformsByTrackId, setWaveformsByTrackId] = useState<Record<string, number[]>>({})

  const playableTracks = useMemo(
    () =>
      assets
        .filter((a) => a.status === 'ready' && a.resultUrl)
        .map((a) => ({
          id: a.id,
          title: a.prompt,
          src: a.resultUrl!,
        })),
    [assets],
  )

  const { currentIndex, showBar, jump, handleStop } = useSoundtrackPlayback(playableTracks)

  const sourceTrackIds = useMemo(
    () => assets.map((a) => a.sourceTrackId).filter((id): id is string => !!id),
    [assets],
  )

  useEffect(() => {
    if (sourceTrackIds.length === 0) return

    let cancelled = false
    fetchTrackWaveformsAction(sourceTrackIds)
      .then((data) => {
        if (!cancelled) setWaveformsByTrackId(data)
      })
      .catch(() => {
        /* fallback to synthetic waveforms in row */
      })

    return () => {
      cancelled = true
    }
  }, [sourceTrackIds.join(',')])

  return (
    <>
      <div className={cn(showBar && 'pb-2')}>
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-0.5">
          {assets.map((asset, index) => {
            const isReady = asset.status === 'ready' && !!asset.resultUrl
            const waveform =
              asset.sourceTrackId && waveformsByTrackId[asset.sourceTrackId]?.length
                ? waveformsByTrackId[asset.sourceTrackId]
                : undefined

            return (
              <SoundtrackWaveformRow
                key={asset.id}
                id={asset.id}
                title={asset.prompt}
                durationSec={asset.durationSec}
                src={asset.resultUrl}
                waveform={waveform}
                index={index}
                isReady={isReady}
                statusLabel={asset.status}
                compactPlayback
              />
            )
          })}
        </div>
      </div>

      {showBar && (
        <LofiSoundtrackBar
          tracks={playableTracks}
          currentIndex={currentIndex}
          onJump={jump}
          onStop={handleStop}
        />
      )}
    </>
  )
}
