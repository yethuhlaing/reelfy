'use client'

import type { Scene } from '@/lib/types'
import { SceneCard } from './SceneCard'
import { SkeletonSceneCard } from './SkeletonSceneCard'
import { useEffect, useRef } from 'react'

interface SceneGridProps {
  scenes: Scene[]
  playingIndex: number | null
  onSceneClick: (index: number) => void
  onAnimateScene?: (sceneId: string) => void
  onPlayScene?: (index: number) => void
  readOnly?: boolean
  skeletonCount?: number
  jobStartedAt?: (sceneId: string) => number | undefined
}

export function SceneGrid({
  scenes,
  playingIndex,
  onSceneClick,
  onAnimateScene,
  onPlayScene,
  readOnly,
  skeletonCount = 0,
  jobStartedAt,
}: SceneGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (playingIndex !== null && cardRefs.current.has(playingIndex)) {
      cardRefs.current.get(playingIndex)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [playingIndex])

  const extra = Math.max(0, skeletonCount - scenes.length)

  return (
    <div className="relative z-0 mt-1 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]" ref={gridRef}>
      {scenes.map((scene, index) => (
        <div key={scene.id} ref={(el) => { if (el) cardRefs.current.set(index, el) }}>
          <SceneCard
            scene={scene}
            index={index}
            isPlaying={playingIndex === index}
            onClick={() => onSceneClick(index)}
            onAnimate={onAnimateScene ? () => onAnimateScene(scene.id) : undefined}
            onPlay={onPlayScene ? () => onPlayScene(index) : undefined}
            readOnly={readOnly}
            jobStartedAt={jobStartedAt?.(scene.id)}
          />
        </div>
      ))}
      {Array.from({ length: extra }).map((_, i) => (
        <SkeletonSceneCard key={`skel-${i}`} index={scenes.length + i} />
      ))}
    </div>
  )
}
