'use client'

import type { Stage } from '@/lib/types'

interface StageListProps {
  stages: Stage[]
  imageProgress?: { done: number; total: number } | null
}

const STATUS_ICON: Record<Stage['status'], string> = {
  pending: '○',
  active: '⟳',
  done: '✓',
  error: '✕',
}

export function StageList({ stages, imageProgress }: StageListProps) {
  return (
    <div className="stage-list">
      {stages.map((s) => {
        const showImageBar = s.id === 'images' && s.status === 'active' && imageProgress && imageProgress.total > 0
        const pct = showImageBar
          ? Math.round((imageProgress!.done / imageProgress!.total) * 100)
          : 0
        return (
          <div key={s.id} className={`stage-row stage-${s.status}`}>
            <span className={`stage-icon ${s.status === 'active' ? 'spin' : ''}`}>
              {STATUS_ICON[s.status]}
            </span>
            <div className="stage-text">
              <div className="stage-label">{s.label}</div>
              {s.detail && <div className="stage-detail">{s.detail}</div>}
              {showImageBar && (
                <div className="stage-progress">
                  <div className="stage-progress-bar">
                    <div className="stage-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="stage-progress-text">
                    {imageProgress!.done}/{imageProgress!.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
