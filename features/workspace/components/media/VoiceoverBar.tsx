'use client'

import { useMemo } from 'react'
import type { Scene } from '@/shared/lib/types'
import { usePathname } from 'next/navigation'
import { SkipBack, SkipForward, X } from 'lucide-react'
import { useWorkspace } from '@/features/workspace/context/workspace-context'
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProgress,
  AudioPlayerTime,
  useAudioPlayer,
} from '@/shared/ui/audio-player'
import { BarVisualizer, type AgentState } from '@/shared/ui/bar-visualizer'
import { useMediaStreamFromAudio, isUsableMediaStream } from '@/shared/hooks/use-media-stream-from-audio'
import { TypingAnimation } from '@/shared/ui/typing-animation'

interface VoiceoverBarProps {
  scene: Scene | null
  currentIndex: number
  totalScenes: number
  isPlaying: boolean
  onStop: () => void
}

export function VoiceoverBar({
  scene,
  currentIndex,
  totalScenes,
  isPlaying,
  onStop,
}: VoiceoverBarProps) {
  const { playScene, setActiveSceneId } = useWorkspace()
  const pathname = usePathname() ?? ''
  const { ref, isPlaying: playerPlaying, isBuffering, activeItem } = useAudioPlayer<{ index: number }>()
  const mediaStream = useMediaStreamFromAudio(ref, isPlaying && playerPlaying, activeItem?.id)
  const visualizerDemo = !isUsableMediaStream(mediaStream)
  const isActivelyPlaying = isPlaying && playerPlaying
  const voiceoverText = scene?.voiceover ?? ''
  const voiceoverLines = useMemo(() => {
    const text = voiceoverText.trim()
    if (!text) return ['']

    const sentences =
      text
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean) || []

    const maxCharsPerLine = 72
    const groupedSentences: string[] = []
    let buffer = ''
    for (const sentence of sentences) {
      const next = buffer ? `${buffer} ${sentence}` : sentence
      if (next.length <= maxCharsPerLine) {
        buffer = next
      } else {
        if (buffer) groupedSentences.push(buffer)
        buffer = sentence
      }
    }
    if (buffer) groupedSentences.push(buffer)
    if (groupedSentences.length > 1) return groupedSentences

    const words = text.split(/\s+/).filter(Boolean)
    const chunkSize = 10
    const chunks: string[] = []
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '))
    }
    return chunks.length > 0 ? chunks : [text]
  }, [voiceoverText])

  if (!pathname.includes('/story/')) return null
  if (!isPlaying || !scene) return null

  const visualizerState: AgentState = isBuffering
    ? 'connecting'
    : playerPlaying
      ? 'speaking'
      : 'listening'

  const jump = (delta: number) => {
    const next = currentIndex + delta
    if (next < 0 || next >= totalScenes) return
    playScene?.(next)
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[700] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-3">
        <button
          className="inline-flex shrink-0 whitespace-nowrap rounded-[20px] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)]"
          onClick={() => setActiveSceneId(scene.id)}
          title="Open scene details"
        >
          Scene {currentIndex + 1}
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-sm text-[var(--text)]">
            {isActivelyPlaying ? (
              <TypingAnimation
                key={`${scene.id}:${voiceoverText}:playing`}
                as="span"
                words={voiceoverLines}
                startOnView={false}
                showCursor
                loop
                duration={24}
                pauseDelay={900}
                instantRestart
                className="block w-full whitespace-normal leading-5 tracking-normal text-sm text-[var(--text)]"
              />
            ) : (
              <span className="block w-full whitespace-normal break-words leading-5 tracking-normal text-sm text-[var(--text)]">
                {voiceoverText}
              </span>
            )}
          </p>
        </div>

        <BarVisualizer
          state={visualizerState}
          demo={visualizerDemo}
          mediaStream={visualizerDemo ? undefined : mediaStream}
          barCount={7}
          minHeight={15}
          maxHeight={90}
          className="h-8 w-24 shrink-0 text-[var(--accent)]"
        />

        <div className="flex w-[180px] shrink-0 items-center gap-2">
          <AudioPlayerProgress className="flex-1 [&_[data-slot=slider-range]]:bg-[var(--accent)] [&_[data-slot=slider-thumb]]:border-[var(--accent)]" />
          <AudioPlayerTime className="text-xs tabular-nums text-[var(--muted)]" />
          <span className="text-xs text-[var(--muted)]">/</span>
          <AudioPlayerDuration className="text-xs tabular-nums text-[var(--muted)]" />
        </div>

        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => jump(-1)}
          disabled={currentIndex <= 0}
          aria-label="Previous"
        >
          <SkipBack size={14} />
        </button>
        <AudioPlayerButton
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
          size="icon"
          variant="outline"
        />
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => jump(1)}
          disabled={currentIndex >= totalScenes - 1}
          aria-label="Next"
        >
          <SkipForward size={14} />
        </button>

        <div className="flex shrink-0 gap-1.5">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition ${i === currentIndex ? 'scale-110 bg-[var(--accent)]' : i <= currentIndex ? 'bg-[var(--muted)]' : 'bg-[var(--border)]'}`}
            />
          ))}
        </div>

        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-2.5 text-[var(--text)] transition hover:border-[#ef4444] hover:text-[#ef4444]"
          onClick={onStop}
          aria-label="Stop"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
