import type { Scene } from '@/shared/lib/types'

export type SceneRenderState = 'skeleton' | 'image' | 'animating' | 'video' | 'error' | 'stuck'

const STALE_MS = 5 * 60 * 1000

export function sceneState(scene: Scene, runStartedAt?: number): SceneRenderState {
  if (scene.lastError && !scene.pendingRunId) return 'error'
  if (scene.pendingRunId) {
    if (runStartedAt && Date.now() - runStartedAt > STALE_MS) return 'stuck'
    return 'animating'
  }
  if (scene.videoUrl) return 'video'
  if (scene.imageUrl) return 'image'
  return 'skeleton'
}
