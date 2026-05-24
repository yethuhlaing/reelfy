import type { Scene } from '@/shared/lib/types'

export type SceneRenderState = 'skeleton' | 'image' | 'animating' | 'video' | 'error' | 'stuck'

const STALE_MS = 5 * 60 * 1000

export function sceneState(scene: Scene, jobStartedAt?: number): SceneRenderState {
  if (scene.lastError && !scene.pendingJobId) return 'error'
  if (scene.pendingJobId) {
    if (jobStartedAt && Date.now() - jobStartedAt > STALE_MS) return 'stuck'
    return 'animating'
  }
  if (scene.videoUrl) return 'video'
  if (scene.imageUrl) return 'image'
  return 'skeleton'
}
