'use client'

import type { Scene } from '@/shared/lib/types'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SkipBack, SkipForward, Play, Pause, X } from 'lucide-react'
import { useWorkspace } from '@/features/workspace/context/workspace-context'

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
  const { audioRef, playScene, setActiveSceneId, setPlayState } = useWorkspace()
  const pathname = usePathname() ?? ''
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState({ current: 0, duration: 0 })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setPaused(false)
  }, [scene?.id])

  useEffect(() => {
    if (!isPlaying) return
    const tick = () => {
      const a = audioRef.current
      if (a) setProgress({ current: a.currentTime, duration: a.duration || 0 })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, audioRef])

  if (!pathname.includes('/story/')) return null
  if (!isPlaying || !scene) return null

  const togglePause = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play(); setPaused(false); setPlayState({ isPlaying: true, currentIndex }) }
    else { a.pause(); setPaused(true) }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current
    if (!a || !progress.duration) return
    a.currentTime = (+e.target.value / 100) * progress.duration
  }

  const jump = (delta: number) => {
    const next = currentIndex + delta
    if (next < 0 || next >= totalScenes) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    playScene?.(next)
  }

  const pct = progress.duration ? (progress.current / progress.duration) * 100 : 0

  return (
    <div className="fixed bottom-6 left-1/2 z-[700] w-[min(960px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-[18px] py-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-6">
        <button
          className="inline-flex whitespace-nowrap rounded-[20px] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)]"
          onClick={() => setActiveSceneId(scene.id)}
          title="Open scene details"
        >
          Scene {currentIndex + 1}
        </button>

        <div className="min-w-0 flex-1"><p className="truncate text-sm text-[var(--text)]">{scene.voiceover}</p></div>

        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pct}
          onChange={seek}
          className="min-w-[100px] flex-1"
          aria-label="Playback position"
        />

        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => jump(-1)}
          disabled={currentIndex <= 0}
          aria-label="Previous"
        >
          <SkipBack size={14} />
        </button>
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)]"
          onClick={togglePause}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button
          className="inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 text-[var(--text)] transition hover:bg-[color-mix(in_srgb,var(--surface2)_70%,var(--accent)_8%)] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => jump(1)}
          disabled={currentIndex >= totalScenes - 1}
          aria-label="Next"
        >
          <SkipForward size={14} />
        </button>

        <div className="flex gap-1.5 max-md:hidden">
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
