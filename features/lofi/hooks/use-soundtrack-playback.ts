'use client'

import { useCallback, useEffect } from 'react'
import { useAudioPlayer } from '@/shared/ui/audio-player'
import type { LofiSoundtrackBarTrack } from '@/features/lofi/components/LofiSoundtrackBar'

export function useSoundtrackPlayback(playableTracks: LofiSoundtrackBarTrack[]) {
  const { activeItem, play, pause, setActiveItem, ref: audioRef } = useAudioPlayer()

  const currentIndex = activeItem
    ? playableTracks.findIndex((t) => t.id === activeItem.id)
    : -1

  const jump = useCallback(
    (delta: number) => {
      if (currentIndex < 0) return
      const next = currentIndex + delta
      if (next < 0 || next >= playableTracks.length) return
      void play(playableTracks[next])
    },
    [currentIndex, playableTracks, play],
  )

  const handleStop = useCallback(() => {
    pause()
    void setActiveItem(null)
  }, [pause, setActiveItem])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || currentIndex < 0) return

    const onEnded = () => {
      if (currentIndex < playableTracks.length - 1) {
        void play(playableTracks[currentIndex + 1])
      } else {
        pause()
      }
    }

    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [audioRef, currentIndex, playableTracks, play, pause])

  return {
    currentIndex,
    showBar: currentIndex >= 0,
    jump,
    handleStop,
  }
}
