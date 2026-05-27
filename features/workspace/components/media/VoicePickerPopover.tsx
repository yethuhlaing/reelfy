'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Play, Square, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ScrollArea } from '@/shared/ui/scroll-area'
import type { ElevenLabsVoice } from '@/app/api/voices/route'

interface Props {
  storyId: string
  currentVoiceId?: string | null
  onVoiceChange: (voiceId: string) => void
  disabled?: boolean
}

export function VoicePickerPopover({ storyId, currentVoiceId, onVoiceChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
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
    setOpen(false)
  }

  useEffect(() => () => stopPreview(), [])

  const active = voices.find((v) => v.voice_id === currentVoiceId)

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) stopPreview(); setOpen(o) }}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          title="Voice"
          style={active ? { borderColor: 'var(--accent)' } : undefined}
        >
          <Mic size={14} />
          {active && <span className="max-w-[72px] truncate text-xs font-medium">{active.name}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
        <div className="border-b border-[var(--border)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[var(--text)]">Choose voice</p>
          {active && <p className="text-[0.7rem] text-[var(--muted)]">Current: {active.name}</p>}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-[var(--muted)]">Loading voices…</div>
        ) : (
          <ScrollArea className="h-72">
            <div className="p-1">
              {voices.map((voice) => {
                const isSelected = voice.voice_id === currentVoiceId
                const isPreviewing = playingId === voice.voice_id
                const gender = voice.labels?.gender ?? ''
                const accent = voice.labels?.accent ?? ''
                const meta = [gender, accent].filter(Boolean).join(' · ')
                return (
                  <div
                    key={voice.voice_id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-[var(--surface2)] ${isSelected ? 'bg-[color-mix(in_srgb,var(--surface2)_60%,var(--accent)_10%)]' : ''}`}
                  >
                    <button
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                      onClick={() => togglePreview(voice)}
                      title={isPreviewing ? 'Stop' : 'Preview'}
                    >
                      {isPreviewing ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                    </button>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => select(voice)}
                    >
                      <p className="truncate text-xs font-medium leading-tight">{voice.name}</p>
                      {meta && <p className="truncate text-[0.65rem] text-[var(--muted)] capitalize leading-tight">{meta}</p>}
                    </button>
                    {isSelected && <Check size={12} className="shrink-0 text-[var(--accent)]" />}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
