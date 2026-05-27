'use client'

import { useEffect, useRef, useState } from 'react'
import type { WordTiming } from '@/shared/lib/types'

export function useWordSync(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  wordTimings: WordTiming[] | null | undefined,
): number {
  const [activeIndex, setActiveIndex] = useState(-1)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!wordTimings?.length) {
      setActiveIndex(-1)
      return
    }

    const tick = () => {
      const audio = audioRef.current
      if (audio && !audio.paused) {
        const ms = audio.currentTime * 1000
        let idx = -1
        for (let i = 0; i < wordTimings.length; i++) {
          const w = wordTimings[i]
          if (ms >= w.startMs && ms < w.endMs) {
            idx = i
            break
          }
        }
        setActiveIndex(idx)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [audioRef, wordTimings])

  return activeIndex
}
