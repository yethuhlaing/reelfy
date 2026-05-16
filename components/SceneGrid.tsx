'use client'

import type { Scene } from '@/lib/types'
import { SceneCard } from './SceneCard'
import { useEffect, useRef } from 'react'

interface SceneGridProps {
  scenes: Scene[]
  playingIndex: number | null
  onSceneClick: (index: number) => void
  onAnimateScene?: (sceneId: string) => void
  onCancelAnimate?: (sceneId: string) => void
}

export function SceneGrid({ scenes, playingIndex, onSceneClick, onAnimateScene, onCancelAnimate }: SceneGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Auto-scroll to playing scene
  useEffect(() => {
    if (playingIndex !== null && cardRefs.current.has(playingIndex)) {
      cardRefs.current.get(playingIndex)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [playingIndex])

  return (
    <div className="scene-grid" ref={gridRef}>
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          ref={(el) => {
            if (el) cardRefs.current.set(index, el)
          }}
        >
          <SceneCard
            scene={scene}
            index={index}
            isPlaying={playingIndex === index}
            onClick={() => onSceneClick(index)}
            onAnimate={onAnimateScene ? () => onAnimateScene(scene.id) : undefined}
            onCancelAnimate={onCancelAnimate ? () => onCancelAnimate(scene.id) : undefined}
            isAnimating={!!scene.pendingJobId}
          />
        </div>
      ))}
    </div>
  )
}
