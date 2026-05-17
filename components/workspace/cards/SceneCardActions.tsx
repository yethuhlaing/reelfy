'use client'

import { Play, Sparkles, RefreshCw, Square } from 'lucide-react'
import type { Scene } from '@/lib/types'
import { sceneState } from '@/lib/states/scene-state'

interface Props {
  scene: Scene
  isPlaying?: boolean
  onPlay?: () => void
  onAnimate?: () => void
  onCancel?: () => void
  readOnly?: boolean
}

export function SceneCardActions({
  scene,
  isPlaying,
  onPlay,
  onAnimate,
  onCancel,
  readOnly,
}: Props) {
  const state = sceneState(scene)

  const stop = (e: React.MouseEvent, fn?: () => void) => {
    e.stopPropagation()
    fn?.()
  }

  return (
    <div className="scene-card-actions">
      {onPlay && !isPlaying && (
        <button
          className="card-action-btn card-action-btn--play"
          onClick={(e) => stop(e, onPlay)}
          title="Play voiceover"
          disabled={readOnly}
        >
          <Play size={13} fill="currentColor" />
        </button>
      )}
      {state === 'animating' ? (
        <button
          className="card-action-btn card-action-btn--cancel"
          onClick={(e) => stop(e, onCancel)}
          title="Stop"
          disabled={readOnly}
        >
          <Square size={13} />
        </button>
      ) : state === 'error' ? (
        <button
          className="card-action-btn card-action-btn--retry"
          onClick={(e) => stop(e, onAnimate)}
          title="Retry"
          disabled={readOnly}
        >
          <RefreshCw size={13} /> Retry
        </button>
      ) : (
        scene.imageUrl && scene.motionPrompt && !scene.videoUrl && (
          <button
            className="card-action-btn card-action-btn--primary"
            onClick={(e) => stop(e, onAnimate)}
            title="Animate"
            disabled={readOnly}
          >
            <Sparkles size={13} /> Animate
          </button>
        )
      )}
    </div>
  )
}
