'use client'

import type { Scene, Emotion } from '@/shared/lib/types'
import { SceneStateBadge } from '../status/SceneStateBadge'
import { SceneCardActions } from './SceneCardActions'

interface SceneCardProps {
  scene: Scene
  index: number
  isPlaying: boolean
  onClick: () => void
  onAnimate?: () => void
  onRegenImage?: () => void
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
  onRegenImage,
  onPlay,
  readOnly,
  jobStartedAt,
}: SceneCardProps) {
  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.25)] transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(0,0,0,0.35)] ${isPlaying ? 'outline outline-2 outline-[var(--accent)]' : ''}`}
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
      <div className="absolute left-3 top-3 z-[1] rounded bg-[var(--bg)] px-2 py-1 text-[0.7rem] text-[var(--muted)]">Scene {index + 1}</div>
      <SceneStateBadge scene={scene} jobStartedAt={jobStartedAt} onClick={scene.lastError ? onClick : undefined} />

      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-white">
        {isPlaying && scene.videoUrl ? (
          <video src={scene.videoUrl} className="block h-full w-full object-cover" autoPlay loop muted playsInline />
        ) : scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scene.imageUrl} alt={scene.sentence} className="block h-full w-full object-cover" />
        ) : scene.videoUrl ? (
          <video src={scene.videoUrl} className="block h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5_8px,#eee_8px,#eee_16px)] text-xs text-[var(--muted)]">
            <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-[var(--muted)] border-t-transparent" />
            <span>Generating…</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm leading-relaxed text-[var(--text)]">{scene.sentence}</p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)] capitalize">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: emotionColors[scene.emotion] }} />
            {scene.emotion}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {scene.characters} {scene.characters === 1 ? 'character' : 'characters'}
          </span>
        </div>
      </div>

      <SceneCardActions
        scene={scene}
        isPlaying={isPlaying}
        onPlay={onPlay}
        onRegenImage={onRegenImage}
        onAnimate={onAnimate}
        readOnly={readOnly}
      />

      {isPlaying && (
        <div className="absolute bottom-4 right-4 flex h-5 items-end gap-[3px]">
          <span className="h-2 w-[3px] animate-pulse rounded bg-[var(--accent)]" />
          <span className="h-3 w-[3px] animate-pulse rounded bg-[var(--accent)]" />
          <span className="h-4 w-[3px] animate-pulse rounded bg-[var(--accent)]" />
        </div>
      )}
    </div>
  )
}
