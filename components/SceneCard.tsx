'use client'

import type { Scene, Emotion } from '@/lib/types'

interface SceneCardProps {
  scene: Scene
  index: number
  isPlaying: boolean
  onClick: () => void
  onAnimate?: () => void
  isAnimating?: boolean
}

const emotionColors: Record<Emotion, string> = {
  triumph: '#f97316',
  frustration: '#ef4444',
  hope: '#3b82f6',
  excitement: '#eab308',
  despair: '#6b7280',
  curiosity: '#a855f7',
  relief: '#22c55e',
  determination: '#f59e0b',
  neutral: '#9ca3af',
}

export function SceneCard({ scene, index, isPlaying, onClick, onAnimate, isAnimating }: SceneCardProps) {
  return (
    <div
      className={`scene-card ${isPlaying ? 'playing' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="scene-number">Scene {index + 1}</div>
      <div className="svg-container">
        {isPlaying && scene.videoUrl ? (
          <video
            src={scene.videoUrl}
            className="scene-image"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={scene.sentence} className="scene-image" />
        ) : (
          <div className="scene-skeleton">
            <span className="scene-skeleton-spinner" />
            <span className="scene-skeleton-label">Generating…</span>
          </div>
        )}
        {scene.videoUrl && !isPlaying && (
          <span className="scene-video-badge" title="Animated">▶</span>
        )}
      </div>
      <div className="scene-content">
        <p className="scene-sentence">{scene.sentence}</p>
        <div className="scene-meta">
          <span
            className="emotion-badge"
            style={{ backgroundColor: emotionColors[scene.emotion] }}
          >
            {scene.emotion}
          </span>
          <span className="character-count">
            {scene.characters} {scene.characters === 1 ? 'character' : 'characters'}
          </span>
        </div>
      </div>
      {onAnimate && scene.imageUrl && scene.motionPrompt && !scene.videoUrl && (
        <button
          className="scene-animate-btn"
          onClick={(e) => {
            e.stopPropagation()
            onAnimate()
          }}
          disabled={isAnimating}
          title="Animate this scene"
        >
          {isAnimating ? '⟳ Animating…' : '✦ Animate'}
        </button>
      )}
      {isPlaying && (
        <div className="playing-indicator">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
      )}
    </div>
  )
}
