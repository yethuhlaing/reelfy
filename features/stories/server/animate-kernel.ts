/**
 * Animate-path adapters over the Video processing kernel.
 *
 * HTTP routes and the workspace stay thin: they call start / get / cancel /
 * retry / onWebhook, and Story GET hydrates scenes from `get(Target)`.
 */

import { VISUAL_PRICING } from '@/features/billing/server/credit-catalog'
import {
  persistSceneVideo,
  uploadSceneVideo,
} from '@/features/stories/server/story-assets'
import {
  getStoryForUser,
  parseOptions,
  type StoredSceneRow,
} from '@/features/stories/server/stories-db'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import { getVideoProvider, VIDEO_PROVIDERS } from '@/shared/lib/providers/video/video'
import type { Scene } from '@/shared/lib/types'
import { createCredits } from '@/shared/lib/video-processing/credits-port'
import { createFalQueue } from '@/shared/lib/video-processing/fal-queue'
import { createVideoKernel, type VideoKernel } from '@/shared/lib/video-processing/kernel'
import { createPgRunStore } from '@/shared/lib/video-processing/run-store-pg'
import type { FalQueue, MediaStore } from '@/shared/lib/video-processing/types'
import { isInFlight } from '@/shared/lib/video-processing/types'
import { videoWebhookUrls } from '@/shared/lib/video-processing/webhooks'

import {
  createAnimatePlanner,
  createSceneResultSink,
  type AnimateVideoProvider,
  type SceneTarget,
} from './animate-adapters'
import { applyAnimateRunToScene } from './animate-run'

export type { SceneTarget }

function resolveAnimateProvider(model: string | undefined): AnimateVideoProvider {
  const provider = getVideoProvider(model)
  return {
    falModel: provider.falModel,
    credits: VISUAL_PRICING[provider.id]?.credits ?? 0,
    queueInput: (imageUrl, prompt, opts) => provider.queueInput(imageUrl, prompt, opts),
  }
}

async function loadAnimateTarget(target: SceneTarget) {
  const result = await getStoryForUser(target.storyId, target.userId)
  if (!result) return null
  const scene = result.scenes.find((row: StoredSceneRow) => row.id === target.sceneId)
  if (!scene) return null
  const options = parseOptions(result.story.options)
  return {
    scene: {
      imageUrl: scene.imageUrl,
      motionPrompt: scene.motionPrompt,
      videoModel: scene.videoModel,
    },
    story: {
      videoModel: options?.videoModel,
      videoQuality: options?.videoQuality,
    },
  }
}

export function createSceneMediaStore(): MediaStore {
  return {
    async rehost({ target, sourceUrl }) {
      if (target.kind !== 'scene') {
        throw new Error(`Scene media store does not handle Target kind ${target.kind}`)
      }
      const res = await fetch(sourceUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error(`fal video download failed: HTTP ${res.status}`)
      const data = Buffer.from(await res.arrayBuffer())
      return uploadSceneVideo(target.storyId, target.sceneId, data)
    },
  }
}

function providerByEndpoint(endpoint: string) {
  return Object.values(VIDEO_PROVIDERS).find((provider) => provider.falModel === endpoint)
}

function wrapFalWithCostLog(inner: FalQueue, store: ReturnType<typeof createPgRunStore>): FalQueue {
  return {
    ...inner,
    async submit(request) {
      const submitted = await inner.submit(request)
      const runId = request.webhookUrl?.match(/\/video\/run\/([^/]+)\//)?.[1]
      const run = runId ? await store.findById(runId) : null
      const provider = providerByEndpoint(request.endpoint)
      if (provider && run?.target.kind === 'scene') {
        await logApiCost({
          userId: run.target.userId,
          storyId: run.target.storyId,
          sceneId: run.target.sceneId,
          provider: 'fal',
          model: provider.id,
          operation: 'scene_video',
          costUsd: provider.costEstimateUsd,
          creditsCharged: VISUAL_PRICING[provider.id]?.credits ?? 0,
        })
      }
      return submitted
    },
  }
}

export function createAnimateKernel(): VideoKernel {
  const store = createPgRunStore()
  return createVideoKernel({
    fal: wrapFalWithCostLog(createFalQueue(), store),
    store,
    credits: createCredits(),
    media: createSceneMediaStore(),
    sink: createSceneResultSink(persistSceneVideo),
    planner: createAnimatePlanner({
      load: loadAnimateTarget,
      resolveProvider: resolveAnimateProvider,
    }),
    webhooks: videoWebhookUrls,
  })
}

/** Idempotent start: join in-flight, retry a failed Run, otherwise a new Run. */
export async function startOrRetryAnimate(target: SceneTarget) {
  const kernel = createAnimateKernel()
  const current = await kernel.get(target)
  if (current && isInFlight(current)) return current
  if (current?.status === 'failed' && current.retryable !== false) {
    return kernel.retry(current.id)
  }
  return kernel.start(target)
}

/** Cancel without reconciling first — a late fal success must not land a clip. */
export async function cancelAnimateRun(target: SceneTarget) {
  const store = createPgRunStore()
  const current = await store.findCurrentByTarget(target)
  if (!current || !isInFlight(current)) return current
  return createAnimateKernel().cancel(current.id)
}

/**
 * Reconcile each scene's current Run on read. A missed webhook plus fal
 * `COMPLETED` becomes a video URL here — not only while this tab is open.
 */
export async function hydrateScenesWithAnimateRuns(
  userId: string,
  storyId: string,
  scenes: Scene[],
): Promise<Scene[]> {
  if (scenes.length === 0) return scenes
  const kernel = createAnimateKernel()
  return Promise.all(
    scenes.map(async (scene) => {
      const run = await kernel.get({
        kind: 'scene',
        userId,
        storyId,
        sceneId: scene.id,
      })
      return applyAnimateRunToScene(scene, run)
    }),
  )
}

export { isInFlight }
