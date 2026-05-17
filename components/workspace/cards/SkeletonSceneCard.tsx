'use client'

interface Props {
  index: number
}

export function SkeletonSceneCard({ index }: Props) {
  return (
    <div className="scene-card scene-card--skeleton" aria-busy="true">
      <div className="scene-number">Scene {index + 1}</div>
      <div className="svg-container">
        <div className="skeleton-shimmer" />
      </div>
      <div className="scene-content">
        <div className="skeleton-line" style={{ width: '90%' }} />
        <div className="skeleton-line" style={{ width: '60%' }} />
      </div>
    </div>
  )
}
