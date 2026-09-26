/**
 * Maps an animate Run onto the Scene the workspace already knows.
 *
 * Story GET hydrates through this so a refresh, another device, or a shared
 * URL sees the in-flight / failed Run without a tab-only pending id.
 */

import type { Scene } from '@/shared/lib/types'
import type { Run } from '@/shared/lib/video-processing/types'
import { isInFlight } from '@/shared/lib/video-processing/types'

export function completedVideoUrl(run: Run): string | undefined {
  for (let i = run.steps.length - 1; i >= 0; i--) {
    const step = run.steps[i]
    if (step.status === 'completed' && step.resultUrl) return step.resultUrl
  }
  return undefined
}

/** Project the current animate Run onto a Scene. `run === null` means no Run. */
export function applyAnimateRunToScene(scene: Scene, run: Run | null): Scene {
  if (!run) {
    return {
      ...scene,
      pendingJobId: undefined,
      lastError: undefined,
      runCreatedAt: undefined,
    }
  }

  if (isInFlight(run)) {
    return {
      ...scene,
      pendingJobId: run.id,
      lastError: undefined,
      runCreatedAt: run.createdAt,
    }
  }

  if (run.status === 'failed') {
    return {
      ...scene,
      pendingJobId: undefined,
      lastError: run.error ?? 'Animation failed',
      runCreatedAt: undefined,
    }
  }

  const videoUrl =
    run.status === 'completed' ? (completedVideoUrl(run) ?? scene.videoUrl) : scene.videoUrl

  return {
    ...scene,
    pendingJobId: undefined,
    lastError: undefined,
    runCreatedAt: undefined,
    videoUrl,
  }
}
