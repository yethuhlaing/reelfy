/**
 * Story export adapters for the Video processing kernel.
 *
 * The story is the Target; compose is the one Step. HTTP routes and the
 * workspace hydrate from `get(Target)` — they do not keep a tab-only job id.
 */

import { persistComposedVideo, uploadComposedVideo } from '@/features/stories/server/story-assets'
import {
  getStoryForUser,
  type StoredSceneRow,
} from '@/features/stories/server/stories-db'
import type { StoryExportHydration } from '@/features/stories/lib/story-export-view'
import { RunNotFoundError } from '@/shared/lib/video-processing/errors'
import { createCredits } from '@/shared/lib/video-processing/credits-port'
import { createFalQueue } from '@/shared/lib/video-processing/fal-queue'
import { createVideoKernel, type VideoKernel } from '@/shared/lib/video-processing/kernel'
import { createPgRunStore } from '@/shared/lib/video-processing/run-store-pg'
import type {
  MediaStore,
  ResultSink,
  Run,
  RunPlanner,
  RunProgress,
  TargetRef,
} from '@/shared/lib/video-processing/types'
import { isInFlight } from '@/shared/lib/video-processing/types'
import { videoWebhookUrls } from '@/shared/lib/video-processing/webhooks'

export const STORY_EXPORT_MODEL_ID = 'fal-ai/ffmpeg-api/compose'

/** One scene as the compose Step consumes it: a visual, its voiceover, and how long it holds. */
export interface ExportSceneInput {
  sceneId: string
  visualUrl: string
  isAnimated: boolean
  voiceoverUrl: string
  duration: number
}

interface FalKeyframe {
  timestamp: number
  duration: number
  url: string
}
interface FalTrack {
  id: string
  type: 'audio' | 'video' | 'image'
  keyframes: FalKeyframe[]
}

export function buildExportTracksPayload(scenes: ExportSceneInput[]): FalTrack[] {
  const videoKeyframes: FalKeyframe[] = []
  const audioKeyframes: FalKeyframe[] = []
  let cursorMs = 0

  for (const scene of scenes) {
    const durMs = Math.round(scene.duration * 1000)
    videoKeyframes.push({ timestamp: cursorMs, duration: durMs, url: scene.visualUrl })
    audioKeyframes.push({ timestamp: cursorMs, duration: durMs, url: scene.voiceoverUrl })
    cursorMs += durMs
  }

  const hasAnimated = scenes.some((s) => s.isAnimated)
  return [
    { id: 'video', type: hasAnimated ? 'video' : 'image', keyframes: videoKeyframes },
    { id: 'audio', type: 'audio', keyframes: audioKeyframes },
  ]
}

export function validateExportScenes(raw: unknown): ExportSceneInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ExportSceneInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const r = item as Record<string, unknown>
    if (
      typeof r.sceneId !== 'string' ||
      typeof r.visualUrl !== 'string' ||
      typeof r.isAnimated !== 'boolean' ||
      typeof r.voiceoverUrl !== 'string' ||
      typeof r.duration !== 'number' ||
      r.duration <= 0
    ) {
      return null
    }
    out.push({
      sceneId: r.sceneId,
      visualUrl: r.visualUrl,
      isAnimated: r.isAnimated,
      voiceoverUrl: r.voiceoverUrl,
      duration: r.duration,
    })
  }
  return out
}

function sceneToExportInput(scene: StoredSceneRow): ExportSceneInput | null {
  const voiceoverUrl = scene.voiceoverUrl
  const visualUrl = scene.videoUrl ?? scene.imageUrl
  const duration = scene.voiceoverDuration != null ? Number(scene.voiceoverDuration) : NaN
  if (!voiceoverUrl || !visualUrl || !Number.isFinite(duration) || duration <= 0) return null
  return {
    sceneId: scene.id,
    visualUrl,
    isAnimated: !!scene.videoUrl,
    voiceoverUrl,
    duration,
  }
}

/**
 * The story's scenes as a compose payload, or a readable error naming the
 * scenes that are not ready.
 *
 * `retry` re-plans from the Target rather than from a stored payload, so this
 * is what a retried compose composes. Dropping the scenes that happen to be
 * incomplete would silently render a *different*, shorter video than the one
 * the user asked for — so an unexportable scene fails the plan instead.
 */
export function exportScenesFromRows(rows: StoredSceneRow[]): ExportSceneInput[] {
  if (rows.length === 0) throw new Error('This story has no scenes to export')

  const scenes: ExportSceneInput[] = []
  const notReady: number[] = []

  rows.forEach((row, index) => {
    const scene = sceneToExportInput(row)
    if (scene) scenes.push(scene)
    else notReady.push(index + 1)
  })

  if (notReady.length > 0) {
    const plural = notReady.length > 1
    throw new Error(
      `Scene ${notReady.join(', ')} ${plural ? 'are' : 'is'} missing a visual, voiceover, or duration`,
    )
  }

  return scenes
}

async function loadExportScenes(target: Extract<TargetRef, { kind: 'story' }>): Promise<ExportSceneInput[]> {
  const result = await getStoryForUser(target.storyId, target.userId)
  if (!result) throw new Error('Story not found')
  return exportScenesFromRows(result.scenes)
}

export function createStoryExportPlanner(input?: { scenes: ExportSceneInput[] }): RunPlanner {
  return {
    async plan(target: TargetRef) {
      if (target.kind !== 'story') {
        throw new Error(`Story export planner received a ${target.kind} Target`)
      }
      const scenes = input?.scenes ?? (await loadExportScenes(target))
      return {
        steps: [
          {
            kind: 'compose' as const,
            stage: 0,
            endpoint: STORY_EXPORT_MODEL_ID,
            credits: 0,
            buildInput: () => ({ tracks: buildExportTracksPayload(scenes) }),
          },
        ],
      }
    },
  }
}

export function createStoryExportMediaStore(): MediaStore {
  return {
    async rehost(params) {
      if (params.target.kind !== 'story') {
        throw new Error(`Story export media store received a ${params.target.kind} Target`)
      }
      const res = await fetch(params.sourceUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error(`fal video download failed: HTTP ${res.status}`)
      const data = Buffer.from(await res.arrayBuffer())
      return uploadComposedVideo(params.target.storyId, data)
    },
  }
}

export function createStoryExportSink(
  persist: typeof persistComposedVideo = persistComposedVideo,
): ResultSink {
  return {
    async apply(params) {
      if (params.target.kind !== 'story') {
        throw new Error(`Story export sink received a ${params.target.kind} Target`)
      }
      const ok = await persist(params.target.storyId, params.target.userId, params.videoUrl)
      if (!ok) throw new Error('Failed to persist composed video URL')
    },
  }
}

export function createStoryExportKernel(input?: { scenes: ExportSceneInput[] }): VideoKernel {
  return createVideoKernel({
    fal: createFalQueue(),
    store: createPgRunStore(),
    credits: createCredits(),
    media: createStoryExportMediaStore(),
    sink: createStoryExportSink(),
    planner: createStoryExportPlanner(input),
    webhooks: videoWebhookUrls,
  })
}

export function storyTarget(userId: string, storyId: string): Extract<TargetRef, { kind: 'story' }> {
  return { kind: 'story', userId, storyId }
}

/** In-flight or failed export for Story GET / the workspace. Terminal success is the video URL. */
export function toStoryExportHydration(run: Run, progress: RunProgress): StoryExportHydration | null {
  if (isInFlight(run)) {
    return {
      runId: run.id,
      status: 'running',
      phase: progress.phase === 'composing' ? 'composing' : null,
      error: run.error,
    }
  }
  if (run.status === 'failed') {
    return {
      runId: run.id,
      status: 'failed',
      phase: null,
      error: run.error,
      retryable: run.retryable,
    }
  }
  if (run.status === 'aborted') {
    return {
      runId: run.id,
      status: 'aborted',
      phase: null,
    }
  }
  return null
}

export async function hydrateStoryExport(
  userId: string,
  storyId: string,
): Promise<{ run: Run | null; exportRun: StoryExportHydration | null }> {
  const kernel = createStoryExportKernel()
  const target = storyTarget(userId, storyId)
  const run = await kernel.get(target)
  if (!run) return { run: null, exportRun: null }
  const progress = await kernel.progress(run.id)
  return {
    run,
    exportRun: progress ? toStoryExportHydration(run, progress) : null,
  }
}

export async function requireStoryExportRun(runId: string, userId: string): Promise<Run> {
  const store = createPgRunStore()
  const run = await store.findById(runId)
  if (!run || run.target.kind !== 'story' || run.target.userId !== userId) {
    throw new RunNotFoundError(runId)
  }
  return run
}
