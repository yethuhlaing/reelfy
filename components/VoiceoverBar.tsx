'use client'

import type { Scene } from '@/lib/types'
import { useEffect, useState } from 'react'

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
  const [displayedText, setDisplayedText] = useState('')

  // Typewriter effect
  useEffect(() => {
    if (!scene) {
      setDisplayedText('')
      return
    }

    const text = scene.voiceover
    setDisplayedText('')

    let index = 0
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        clearInterval(interval)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [scene])

  if (!isPlaying || !scene) return null

  return (
    <div className="voiceover-bar">
      <div className="voiceover-content">
        <div className="scene-pill">Scene {currentIndex + 1}</div>

        <div className="voiceover-text">
          <p>{displayedText}<span className="cursor">|</span></p>
        </div>

        <div className="waveform">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>

        <div className="progress-dots">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <span
              key={i}
              className={`dot ${i <= currentIndex ? 'active' : ''} ${i === currentIndex ? 'current' : ''}`}
            />
          ))}
        </div>

        <button className="stop-btn" onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  )
}
