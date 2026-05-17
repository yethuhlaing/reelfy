'use client'

import type { Scene } from '@/lib/types'
import { sceneState } from '@/lib/states/scene-state'
import { AlertCircle, Loader2, Play, Clock } from 'lucide-react'

interface Props {
  scene: Scene
  jobStartedAt?: number
  onClick?: () => void
}

export function SceneStateBadge({ scene, jobStartedAt, onClick }: Props) {
  const state = sceneState(scene, jobStartedAt)

  if (state === 'image' || state === 'skeleton') return null

  const common = {
    onClick: onClick
      ? (e: React.MouseEvent) => {
          e.stopPropagation()
          onClick()
        }
      : undefined,
    title:
      state === 'error'
        ? scene.lastError ?? 'Error'
        : state === 'animating'
          ? 'Animating'
          : state === 'stuck'
            ? 'Taking longer than usual'
            : 'Animated',
    className: `scene-badge scene-badge--${state}${onClick ? ' scene-badge--clickable' : ''}`,
  }

  if (state === 'error') return <span {...common}><AlertCircle size={11} /></span>
  if (state === 'animating') return <span {...common}><Loader2 size={11} className="animate-spin" /> <em>Animating</em></span>
  if (state === 'stuck') return <span {...common}><Clock size={11} /> <em>Slow</em></span>
  if (state === 'video') return <span {...common}><Play size={11} /></span>
  return null
}
