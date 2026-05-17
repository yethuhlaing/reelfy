'use client'

import type { Scene } from '@/lib/types'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SkipBack, SkipForward, Play, Pause, X } from 'lucide-react'
import { useWorkspace } from '@/context/workspace-context'

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
    <div className="voiceover-bar">
      <div className="voiceover-content">
        <button className="scene-pill" onClick={() => setActiveSceneId(scene.id)} title="Open scene details">
          Scene {currentIndex + 1}
        </button>

        <div className="voiceover-text"><p>{scene.voiceover}</p></div>

        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={pct}
          onChange={seek}
          style={{ flex: 1, minWidth: 100 }}
          aria-label="Playback position"
        />

        <button className="icon-btn" onClick={() => jump(-1)} disabled={currentIndex <= 0} aria-label="Previous">
          <SkipBack size={14} />
        </button>
        <button className="icon-btn" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button className="icon-btn" onClick={() => jump(1)} disabled={currentIndex >= totalScenes - 1} aria-label="Next">
          <SkipForward size={14} />
        </button>

        <div className="progress-dots">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <span
              key={i}
              className={`dot ${i <= currentIndex ? 'active' : ''} ${i === currentIndex ? 'current' : ''}`}
            />
          ))}
        </div>

        <button className="stop-btn" onClick={onStop} aria-label="Stop">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
