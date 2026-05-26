'use client'

import { Play, Sparkles, RefreshCw, Square } from 'lucide-react'
import type { Scene } from '@/shared/lib/types'
import { sceneState } from '@/features/workspace/lib/scene-state'

interface Props {
  scene: Scene
  isPlaying?: boolean
  onPlay?: () => void
  onRegenImage?: () => void
  onAnimate?: () => void
  onCancel?: () => void
  readOnly?: boolean
}

export function SceneCardActions({
  scene,
  isPlaying,
  onPlay,
  onRegenImage,
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
    <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[2] flex translate-y-1 justify-end gap-1.5 opacity-0 transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
      {onPlay && !isPlaying && (
        <button
          className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_72%,var(--accent)_28%)] text-[var(--text)] shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          onClick={(e) => stop(e, onPlay)}
          title="Play voiceover"
          disabled={readOnly}
        >
          <Play size={13} fill="currentColor" />
        </button>
      )}
      {state === 'animating' ? (
        <button
          className="pointer-events-auto inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[#b91c1c] bg-[#b91c1c] px-2.5 text-[0.72rem] text-white"
          onClick={(e) => stop(e, onCancel)}
          title="Stop"
          disabled={readOnly}
        >
          <Square size={13} />
        </button>
      ) : (
        <>
          {onRegenImage && scene.imagePrompt && (
            <button
              className="pointer-events-auto inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[0.72rem] text-[var(--text)] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
              onClick={(e) => stop(e, onRegenImage)}
              title={scene.imageUrl ? 'Regenerate image' : 'Generate image'}
              disabled={readOnly}
            >
              <RefreshCw size={13} /> {scene.imageUrl ? 'Regen' : 'Image'}
            </button>
          )}
          {onAnimate && scene.imageUrl && scene.motionPrompt && (
            <button
              className="pointer-events-auto inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-2.5 text-[0.72rem] text-[#111] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
              onClick={(e) => stop(e, onAnimate)}
              title={scene.videoUrl ? 'Re-animate scene' : 'Animate scene'}
              disabled={readOnly}
            >
              <Sparkles size={13} /> {scene.videoUrl ? 'Re-animate' : 'Animate'}
            </button>
          )}
          {state === 'error' && onAnimate && (
            <button
              className="pointer-events-auto inline-flex h-7 items-center justify-center gap-1 rounded-md border border-[#ca8a04] bg-[#ca8a04] px-2.5 text-[0.72rem] text-[#111]"
              onClick={(e) => stop(e, onAnimate)}
              title="Retry animation"
              disabled={readOnly || !scene.imageUrl || !scene.motionPrompt}
            >
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </>
      )}
    </div>
  )
}
