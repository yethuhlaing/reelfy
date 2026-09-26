/**
 * Brainrot export adapters for the Video processing kernel.
 *
 * The brainrot project is the Target; compose and subtitle are two Steps of one
 * Run. Nothing here needs a job id: the project page, its stream and the
 * dashboard all reach the Run through `get(Target)`.
 */

import { brainrotExportCredits, COMPOSE_MODEL_ID, SUBTITLE_MODEL_ID } from '@/features/brainrot/constants'
import type { BrainrotExportHydration, BrainrotExportPhase } from '@/features/brainrot/lib/brainrot-export-view'
import {
  uploadBrainrotComposed,
  uploadBrainrotOutput,
} from '@/features/brainrot/server/brainrot-assets'
import {
  getBrainrotProjectForUser,
  updateBrainrotProject,
} from '@/features/brainrot/server/brainrot-db'
import {
  buildSubtitleInput,
  prepareBrainrotExportAssets,
} from '@/features/brainrot/server/export-pipeline'
import type {
  BrainrotCaptionPosition,
  BrainrotProject,
  BrainrotStatus,
} from '@/shared/lib/types/brainrot'
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
  TargetRef,
} from '@/shared/lib/video-processing/types'
import { isInFlight } from '@/shared/lib/video-processing/types'
import { videoWebhookUrls } from '@/shared/lib/video-processing/webhooks'

export type BrainrotTarget = Extract<TargetRef, { kind: 'brainrotProject' }>

export function brainrotTarget(userId: string, projectId: string): BrainrotTarget {
  return { kind: 'brainrotProject', userId, projectId }
}

function requireBrainrotTarget(target: TargetRef, what: string): BrainrotTarget {
  if (target.kind !== 'brainrotProject') {
    throw new Error(`Brainrot export ${what} received a ${target.kind} Target`)
  }
  return target
}

// --- Export options ---------------------------------------------------------

export interface BrainrotExportOptions {
  script: string
  backgroundCategory: string
  characterVoiceId: string
  captionPosition: string
}

/** The stored assets a new export can start from, or `null` when it cannot. */
type ReusableAssets = NonNullable<
  Parameters<typeof prepareBrainrotExportAssets>[0]['reuseVoiceover']
>

export function reusableAssets(project: BrainrotProject): ReusableAssets | null {
  if (
    !project.voiceoverUrl ||
    !project.voiceoverWordTimings?.length ||
    project.voiceoverDurationSec == null
  ) {
    return null
  }
  return {
    voiceoverUrl: project.voiceoverUrl,
    voiceoverDurationSec: project.voiceoverDurationSec,
    wordTimings: project.voiceoverWordTimings,
    backgroundVideoId: project.backgroundVideoId,
    chunkStartIndex: project.chunkStartIndex,
    chunkUrls: project.chunkUrls,
  }
}

/**
 * What a new export must throw away, and what it costs.
 *
 * The planner is consulted again on every converge, so it cannot re-derive
 * which stored assets are stale — it simply reuses whatever the project row
 * still holds. This decides, once, what the row should hold. Moving the
 * caption box on an otherwise unchanged reel re-uses the voiceover it already
 * paid for, so it is free.
 */
export function resolveBrainrotExportChange(
  project: BrainrotProject,
  next: BrainrotExportOptions,
): { clearVoiceover: boolean; clearChunks: boolean; captionOnly: boolean; credits: number } {
  const voiceoverChanged =
    project.script !== next.script || project.characterVoiceId !== next.characterVoiceId
  const chunksChanged =
    voiceoverChanged || project.backgroundCategory !== next.backgroundCategory
  const hasAssets = reusableAssets(project) !== null && !!project.chunkUrls?.length

  const captionOnly =
    !chunksChanged && hasAssets && project.captionPosition !== next.captionPosition

  const wordCount = next.script.split(/\s+/).filter(Boolean).length

  return {
    clearVoiceover: voiceoverChanged,
    clearChunks: chunksChanged,
    captionOnly,
    credits: captionOnly ? 0 : brainrotExportCredits(wordCount),
  }
}

// --- Ports ------------------------------------------------------------------

async function loadProject(target: BrainrotTarget): Promise<BrainrotProject> {
  const project = await getBrainrotProjectForUser(target.projectId, target.userId)
  if (!project) throw new Error('Brainrot project not found')
  return project
}

/**
 * Generates whatever the project is missing (voiceover, gameplay chunks),
 * persists it, and returns the compose payload.
 *
 * This runs inside `buildInput`, not inside `plan`, so advancing to the
 * subtitle Step never re-enters ElevenLabs. A compose retry re-uses the
 * voiceover the first attempt already paid for.
 */
async function composeTracksForProject(target: BrainrotTarget) {
  const project = await loadProject(target)
  if (!project.script.trim()) throw new Error('This project has no script to export')

  const assets = await prepareBrainrotExportAssets({
    projectId: target.projectId,
    script: project.script,
    backgroundCategory: project.backgroundCategory,
    characterVoiceId: project.characterVoiceId,
    userId: target.userId,
    reuseVoiceover: reusableAssets(project),
  })

  await updateBrainrotProject(target.projectId, target.userId, {
    voiceoverUrl: assets.voiceoverUrl,
    voiceoverDurationSec: assets.voiceoverDurationSec,
    voiceoverWordTimings: assets.wordTimings,
    backgroundVideoId: assets.backgroundVideoId,
    chunkStartIndex: assets.chunkStartIndex,
    chunkUrls: assets.chunkUrls,
  })

  return assets.tracks
}

/**
 * Compose then subtitle. Only `start` reads the credit figure — `retry` prices
 * from the Steps the Run already stores, so a subtitle-only retry is free.
 */
export function createBrainrotExportPlanner(input?: {
  credits?: number
  loadCaptionPosition?: (target: BrainrotTarget) => Promise<BrainrotCaptionPosition>
  buildComposeInput?: (target: BrainrotTarget) => Promise<Record<string, unknown>>
}): RunPlanner {
  const loadCaptionPosition =
    input?.loadCaptionPosition ??
    (async (target: BrainrotTarget) => (await loadProject(target)).captionPosition)
  const buildComposeInput =
    input?.buildComposeInput ??
    (async (target: BrainrotTarget) => ({ tracks: await composeTracksForProject(target) }))

  return {
    async plan(rawTarget: TargetRef) {
      const target = requireBrainrotTarget(rawTarget, 'planner')
      const captionPosition = await loadCaptionPosition(target)

      return {
        steps: [
          {
            kind: 'compose' as const,
            stage: 0,
            endpoint: COMPOSE_MODEL_ID,
            credits: input?.credits ?? 0,
            buildInput: () => buildComposeInput(target),
          },
          {
            kind: 'subtitle' as const,
            stage: 1,
            endpoint: SUBTITLE_MODEL_ID,
            // Priced onto compose: one export, one charge, whichever Step retries.
            credits: 0,
            buildInput: ({ previousResultUrls }) => {
              const composed = previousResultUrls[previousResultUrls.length - 1]
              if (!composed) throw new Error('Subtitle Step has no composed video to caption')
              return buildSubtitleInput(composed, captionPosition)
            },
          },
        ],
      }
    },
  }
}

/**
 * Both Steps rehost. The composed video is kept because a subtitle-only retry
 * an hour later still needs it, and fal's queue result is long gone by then.
 */
export function createBrainrotExportMediaStore(): MediaStore {
  return {
    async rehost(params) {
      const target = requireBrainrotTarget(params.target, 'media store')
      const res = await fetch(params.sourceUrl, { cache: 'no-store' })
      if (!res.ok) throw new Error(`fal video download failed: HTTP ${res.status}`)
      const data = Buffer.from(await res.arrayBuffer())
      return params.step.kind === 'compose'
        ? uploadBrainrotComposed(target.projectId, data)
        : uploadBrainrotOutput(target.projectId, data)
    },
  }
}

export function createBrainrotExportSink(
  update: typeof updateBrainrotProject = updateBrainrotProject,
): ResultSink {
  return {
    async apply(params) {
      const target = requireBrainrotTarget(params.target, 'sink')
      const updated = await update(target.projectId, target.userId, {
        outputVideoUrl: params.videoUrl,
        status: 'complete',
      })
      if (!updated) throw new Error('Failed to persist the brainrot output URL')
    },
  }
}

// --- Project status mirror --------------------------------------------------

/**
 * The project row carries a `status` the dashboard reads without touching a
 * Run. Every kernel operation squares it, so a card can never sit on
 * "Rendering" after the Run behind it died.
 */
export function projectStatusForRun(run: Run, project: { script: string }): BrainrotStatus {
  if (isInFlight(run)) return 'rendering'
  if (run.status === 'completed') return 'complete'
  if (run.status === 'failed') return 'failed'
  return project.script.trim() ? 'script_ready' : 'draft'
}

async function syncProjectStatus(run: Run): Promise<void> {
  if (run.target.kind !== 'brainrotProject') return
  const project = await getBrainrotProjectForUser(run.target.projectId, run.target.userId)
  if (!project) return
  const status = projectStatusForRun(run, project)
  if (project.status === status) return
  await updateBrainrotProject(run.target.projectId, run.target.userId, { status })
}

/** Wraps every operation so the Run and the project row never disagree. */
function withStatusMirror(kernel: VideoKernel): VideoKernel {
  const mirror = async (run: Run): Promise<Run> => {
    await syncProjectStatus(run).catch(() => {})
    return run
  }
  return {
    start: async (target) => mirror(await kernel.start(target)),
    get: async (target) => {
      const run = await kernel.get(target)
      return run ? await mirror(run) : null
    },
    cancel: async (runId) => mirror(await kernel.cancel(runId)),
    retry: async (runId) => mirror(await kernel.retry(runId)),
    onWebhook: async (params) => mirror(await kernel.onWebhook(params)),
    progress: (runId) => kernel.progress(runId),
  }
}

export function createBrainrotExportKernel(input?: { credits?: number }): VideoKernel {
  return withStatusMirror(
    createVideoKernel({
      fal: createFalQueue(),
      store: createPgRunStore(),
      credits: createCredits(),
      media: createBrainrotExportMediaStore(),
      sink: createBrainrotExportSink(),
      planner: createBrainrotExportPlanner(input),
      webhooks: videoWebhookUrls,
    }),
  )
}

// --- Reads ------------------------------------------------------------------

/**
 * The phase from a Run already in hand. The stream polls every second and a
 * half; asking the store for `progress` each time just to name the Step the
 * Run already carries would double its reads.
 */
export function phaseForRun(run: Run): BrainrotExportPhase | null {
  if (!isInFlight(run)) return null
  const pending = run.steps.filter((step) => step.status !== 'completed')
  const lowest = pending.reduce<number | null>(
    (stage, step) => (stage === null || step.stage < stage ? step.stage : stage),
    null,
  )
  const current = lowest === null ? undefined : pending.find((step) => step.stage === lowest)
  if (!current) return null
  return current.kind === 'subtitle' ? 'subtitling' : 'composing'
}

export function toBrainrotExportHydration(run: Run): BrainrotExportHydration | null {
  if (isInFlight(run)) {
    return { runId: run.id, status: 'running', phase: phaseForRun(run), error: run.error }
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
    return { runId: run.id, status: 'aborted', phase: null }
  }
  return null
}

/**
 * A project claiming to render with no Run behind it is not rendering — it is
 * an export from before this Target had Runs, or one whose `start` died before
 * it ever reached the store. Either way nothing will ever finish it, so it
 * settles as a failure the user can retry instead of a spinner that never ends.
 */
export function orphanedRenderingStatus(
  project: { status: string; outputVideoUrl: string | null },
  run: Run | null,
): BrainrotStatus | null {
  if (run || project.status !== 'rendering') return null
  return project.outputVideoUrl ? 'complete' : 'failed'
}

async function settleOrphanedRendering(
  userId: string,
  project: BrainrotProject,
  run: Run | null,
): Promise<BrainrotProject> {
  const status = orphanedRenderingStatus(project, run)
  if (!status) return project
  return (await updateBrainrotProject(project.id, userId, { status })) ?? project
}

/**
 * The project as the page should render it: reconciled against fal first, so a
 * missed webhook becomes a finished reel on this read rather than on the next
 * one that happens to have a client attached.
 */
export async function hydrateBrainrotProject(
  userId: string,
  projectId: string,
): Promise<{ project: BrainrotProject; exportRun: BrainrotExportHydration | null } | null> {
  const kernel = createBrainrotExportKernel()
  const target = brainrotTarget(userId, projectId)

  const run = await kernel.get(target).catch(() => null)
  const stored = await getBrainrotProjectForUser(projectId, userId)
  if (!stored) return null
  const project = await settleOrphanedRendering(userId, stored, run)

  return { project, exportRun: run ? toBrainrotExportHydration(run) : null }
}

/** Reconciles the reels a listing shows as rendering. Returns the ids it touched. */
export async function reconcileRenderingBrainrotProjects(
  userId: string,
  projects: BrainrotProject[],
): Promise<string[]> {
  const stuck = projects.filter((project) => project.status === 'rendering')
  if (stuck.length === 0) return []
  const kernel = createBrainrotExportKernel()
  await Promise.all(
    stuck.map(async (project) => {
      const run = await kernel.get(brainrotTarget(userId, project.id)).catch(() => null)
      await settleOrphanedRendering(userId, project, run).catch(() => project)
    }),
  )
  return stuck.map((project) => project.id)
}

export async function requireBrainrotExportRun(runId: string, userId: string): Promise<Run> {
  const run = await createPgRunStore().findById(runId)
  if (!run || run.target.kind !== 'brainrotProject' || run.target.userId !== userId) {
    throw new RunNotFoundError(runId)
  }
  return run
}

/** The Target's current Run, without reconciling — cancel must not race a late success. */
export async function currentBrainrotRun(target: BrainrotTarget): Promise<Run | null> {
  return createPgRunStore().findCurrentByTarget(target)
}
