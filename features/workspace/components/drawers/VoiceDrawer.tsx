'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Square, Check } from 'lucide-react'
import { Drawer } from './Drawer'
import type { ElevenLabsVoice } from '@/app/api/voices/route'

interface Props {
  open: boolean
  onClose: () => void
  currentVoiceId?: string | null
  onVoiceChange: (voiceId: string) => void
}

export function VoiceDrawer({ open, onClose, currentVoiceId, onVoiceChange }: Props) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!open || voices.length > 0) return
    setLoading(true)
    fetch('/api/voices')
      .then((r) => r.json())
      .then((d: { voices: ElevenLabsVoice[] }) => setVoices(d.voices ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, voices.length])

  const stopPreview = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlayingId(null)
  }

  const togglePreview = (voice: ElevenLabsVoice) => {
    if (playingId === voice.voice_id) {
      stopPreview()
      return
    }
    stopPreview()
    const audio = new Audio(voice.preview_url)
    audioRef.current = audio
    setPlayingId(voice.voice_id)
    audio.play().catch(() => {})
    audio.onended = () => setPlayingId(null)
  }

  const select = (voice: ElevenLabsVoice) => {
    stopPreview()
    onVoiceChange(voice.voice_id)
    onClose()
  }

  useEffect(() => {
    if (!open) stopPreview()
  }, [open])
  useEffect(() => () => stopPreview(), [])

  return (
    <Drawer open={open} onClose={onClose} title="Voice" placement="right">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-[var(--muted)]">Loading voices…</div>
      ) : (
        <div className="flex flex-col gap-1">
          {voices.map((voice) => {
            const isSelected = voice.voice_id === currentVoiceId
            const isPreviewing = playingId === voice.voice_id
            const gender = voice.labels?.gender ?? ''
            const accent = voice.labels?.accent ?? ''
            const meta = [gender, accent].filter(Boolean).join(' · ')
            return (
              <div
                key={voice.voice_id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-[var(--surface2)] ${isSelected ? 'bg-[color-mix(in_srgb,var(--surface2)_60%,var(--accent)_10%)]' : ''}`}
              >
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  onClick={() => togglePreview(voice)}
                  title={isPreviewing ? 'Stop' : 'Preview'}
                >
                  {isPreviewing ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => select(voice)}>
                  <p className="truncate text-sm font-medium leading-tight">{voice.name}</p>
                  {meta && <p className="truncate text-xs text-[var(--muted)] capitalize leading-tight">{meta}</p>}
                </button>
                {isSelected && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
              </div>
            )
          })}
        </div>
      )}
    </Drawer>
  )
}
