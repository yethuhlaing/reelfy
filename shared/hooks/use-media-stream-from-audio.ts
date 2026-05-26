'use client'

import { useEffect, useState, type RefObject } from 'react'

type CapturableMediaElement = HTMLMediaElement & {
  captureStream?: () => MediaStream
  mozCaptureStream?: () => MediaStream
}

export function isUsableMediaStream(
  stream: MediaStream | null | undefined,
): stream is MediaStream {
  return !!stream?.getAudioTracks().some((t) => t.readyState === 'live')
}

export function useMediaStreamFromAudio(
  audioRef: RefObject<HTMLAudioElement | null>,
  enabled: boolean,
  trackId?: string | number | null,
): MediaStream | null {
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStream(null)
      return
    }

    const audio = audioRef.current
    if (!audio) {
      setStream(null)
      return
    }

    let cancelled = false

    const capture = () => {
      if (cancelled) return
      const el = audio as CapturableMediaElement
      try {
        const captured =
          el.captureStream?.() ??
          el.mozCaptureStream?.() ??
          null
        setStream(isUsableMediaStream(captured) ? captured : null)
      } catch {
        setStream(null)
      }
    }

    if (!audio.paused && audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      capture()
    }

    audio.addEventListener('playing', capture)
    audio.addEventListener('canplay', capture)

    return () => {
      cancelled = true
      audio.removeEventListener('playing', capture)
      audio.removeEventListener('canplay', capture)
      setStream(null)
    }
  }, [audioRef, enabled, trackId])

  return stream
}
