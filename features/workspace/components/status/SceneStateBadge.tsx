'use client'

import type { Scene } from '@/shared/lib/types'
import { sceneState } from '@/features/workspace/lib/scene-state'
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
    className: `absolute right-2 top-2 z-[3] inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.04em] ${
      state === 'error'
        ? 'bg-[#b91c1c] text-white'
        : state === 'stuck'
          ? 'bg-[#ca8a04] text-[#111]'
          : state === 'animating'
            ? 'bg-[rgba(59,130,246,0.85)] text-white'
            : 'bg-[rgba(34,197,94,0.85)] text-[#052]'
    } ${onClick ? 'cursor-pointer hover:brightness-110' : ''}`,
  }

  if (state === 'error') return <span {...common}><AlertCircle size={11} /></span>
  if (state === 'animating') return <span {...common}><Loader2 size={11} className="animate-spin" /> <em>Animating</em></span>
  if (state === 'stuck') return <span {...common}><Clock size={11} /> <em>Slow</em></span>
  if (state === 'video') return <span {...common}><Play size={11} /></span>
  return null
}
