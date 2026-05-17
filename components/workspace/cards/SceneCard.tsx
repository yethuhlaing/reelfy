'use client'

import type { Scene, Emotion } from '@/lib/types'
import { SceneStateBadge } from '../status/SceneStateBadge'
import { SceneCardActions } from './SceneCardActions'

interface SceneCardProps {
  scene: Scene
  index: number
  isPlaying: boolean
  onClick: () => void
  onAnimate?: () => void
  onCancelAnimate?: () => void
  onPlay?: () => void
  readOnly?: boolean
  jobStartedAt?: number
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

export function SceneCard({
  scene,
  index,
  isPlaying,
  onClick,
  onAnimate,
  onCancelAnimate,
  onPlay,
  readOnly,
  jobStartedAt,
}: SceneCardProps) {
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
      <SceneStateBadge scene={scene} jobStartedAt={jobStartedAt} onClick={scene.lastError ? onClick : undefined} />

      <div className="svg-container">
        {isPlaying && scene.videoUrl ? (
          <video src={scene.videoUrl} className="scene-image" autoPlay loop muted playsInline />
        ) : scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={scene.sentence} className="scene-image" />
        ) : scene.videoUrl ? (
          <video src={scene.videoUrl} className="scene-image" muted playsInline preload="metadata" />
        ) : (
          <div className="scene-skeleton">
            <span className="scene-skeleton-spinner" />
            <span className="scene-skeleton-label">Generating…</span>
          </div>
        )}
      </div>

      <div className="scene-content">
        <p className="scene-sentence">{scene.sentence}</p>
        <div className="scene-meta">
          <span className="emotion-badge" style={{ backgroundColor: emotionColors[scene.emotion] }}>
            {scene.emotion}
          </span>
          <span className="character-count">
            {scene.characters} {scene.characters === 1 ? 'character' : 'characters'}
          </span>
        </div>
      </div>

      <SceneCardActions
        scene={scene}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onAnimate={onAnimate}
        onCancel={onCancelAnimate}
        readOnly={readOnly}
      />

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
