/**
 * Lofi Run wiring: the kernel, its Postgres-backed ports, and the operations
 * routes call.
 *
 * The planner and the projections live in `lofi-adapters.ts`; everything here
 * touches the outside world.
 */

import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import { uploadComposedVideo } from '@/features/stories/server/story-assets'
import { db } from '@/shared/lib/db'
import { getCredits } from '@/shared/lib/db/credits'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import { lofiAssets, lofiVideos, stories } from '@/shared/lib/db/schema'
import { redis } from '@/shared/lib/integrations/redis'
import { createCredits } from '@/shared/lib/video-processing/credits-port'
import { InsufficientCreditsError, RunNotFoundError } from '@/shared/lib/video-processing/errors'
import { createFalQueue } from '@/shared/lib/video-processing/fal-queue'
import { createVideoKernel, type VideoKernel } from '@/shared/lib/video-processing/kernel'
import { createPgRunStore } from '@/shared/lib/video-processing/run-store-pg'
import type { MediaStore, ResultSink, Run } from '@/shared/lib/video-processing/types'
import { isInFlight } from '@/shared/lib/video-processing/types'
import { videoWebhookUrls } from '@/shared/lib/video-processing/webhooks'

import type { LofiRunHydration } from '@/features/lofi/lib/lofi-run-view'
import {
  assertLofiRenderable,
  buildAssetRows,
  buildLofiComposeInput,
  createLofiPlanner,
  lofiAssetCounts,
  lofiPhaseForRun,
  lofiRetryOffer,
  lofiStatusForRun,
  lofiTarget,
  orphanedLofiStatus,
  readyLofiAssets,
  requireLofiTarget,
  toLofiAssetKind,
  toLofiRunHydration,
  LOFI_ASSET_STATUS_BY_STEP,
  type GenerateInput,
  type LofiAssetRow,
  type LofiTarget,
  type LofiVideoRow,
  type NewLofiAssetRow,
} from './lofi-adapters'
import { downloadToBuffer, rehostToLofiBlob } from './lofi-blob-assets'
import {
  finalizeLofiVideo,
  getLofiAssetsForVideo,
  getLofiVideo,
  getLofiVideoForUser,
  updateLofiAsset,
  updateLofiVideo,
} from './lofi-db'
import { calculateTotalCredits, getLofiMinSuccessRate, RENDER_CREDITS } from './pricing'

export * from './lofi-adapters'
export { InsufficientCreditsError }

// --- Render input -----------------------------------------------------------

async function buildLofiRenderInput(
  target: LofiTarget,
  run: Run,
): Promise<Record<string, unknown>> {
  const video = await getLofiVideo(target.videoId)
  if (!video) throw new Error('Video not found')

  const assets = await getLofiAssetsForVideo(target.videoId)
  const ready = readyLofiAssets(assets, run)
  assertLofiRenderable(ready, await getLofiMinSuccessRate())

  const { tracks, arrangementJson } = buildLofiComposeInput(video, ready)
  await updateLofiVideo(target.videoId, { arrangementJson })

  return { tracks }
}

// --- Ports ------------------------------------------------------------------

export function createLofiMediaStore(): MediaStore {
  return {
    async rehost(params) {
      const target = requireLofiTarget(params.target, 'media store')
      const video = await getLofiVideo(target.videoId)
      if (!video) throw new Error('Video not found')

      if (params.step.kind === 'render') {
        const { data } = await downloadToBuffer(params.sourceUrl)
        return uploadComposedVideo(video.storyId, data)
      }

      const assetId = params.step.ref
      if (!assetId) throw new Error('Asset Step has no asset row to rehost into')
      const asset = await db.query.lofiAssets.findFirst({ where: eq(lofiAssets.id, assetId) })
      if (!asset) throw new Error('Asset row not found')

      return rehostToLofiBlob({
        storyId: video.storyId,
        assetId,
        kind: toLofiAssetKind(asset.kind),
        sourceUrl: params.sourceUrl,
      })
    },
  }
}

export function createLofiSink(): ResultSink {
  return {
    async apply(params) {
      const target = requireLofiTarget(params.target, 'sink')
      const video = await getLofiVideo(target.videoId)
      if (!video) throw new Error('Video not found')

      await finalizeLofiVideo(target.videoId, params.videoUrl, video.targetDurationSec)

      await logApiCost({
        userId: target.userId,
        storyId: video.storyId,
        provider: 'fal',
        model: 'ffmpeg-api/compose',
        operation: 'lofi_render',
        costUsd: RENDER_CREDITS * 0.01,
        creditsCharged: RENDER_CREDITS,
      }).catch(() => {})
    },
  }
}

// --- Row mirror -------------------------------------------------------------

const VIDEO_STATUS_TTL = 3600

async function publishLofiStatus(
  videoId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await redis.set(`lofi:video:${videoId}:status`, JSON.stringify({ ...payload, ts: Date.now() }), {
    ex: VIDEO_STATUS_TTL,
  })
}

/**
 * Squares the lofi rows with the Run after every operation.
 *
 * The page reads asset rows and the dashboard reads the video's status, so
 * neither can be left saying "generating" once the Run behind it is done. The
 * Redis publish is what stops a second tab sitting on a cancelled video.
 */
async function mirrorRunToRows(run: Run): Promise<void> {
  if (run.target.kind !== 'lofiVideo') return
  const videoId = run.target.videoId

  const assets = await getLofiAssetsForVideo(videoId)
  const byId = new Map(assets.map((asset) => [asset.id, asset]))

  for (const step of run.steps) {
    if (!step.ref) continue
    const asset = byId.get(step.ref)
    if (!asset) continue

    const status = LOFI_ASSET_STATUS_BY_STEP[step.status]
    const creditsCharged = step.status === 'completed' ? step.credits : 0
    const resultUrl = step.resultUrl ?? asset.resultUrl
    const falJobId = step.providerRequestId ?? null
    const errorMessage = step.error ?? null

    if (
      asset.status === status &&
      asset.resultUrl === resultUrl &&
      asset.falJobId === falJobId &&
      asset.creditsCharged === creditsCharged &&
      asset.errorMessage === errorMessage
    ) {
      continue
    }

    await updateLofiAsset(asset.id, {
      status,
      resultUrl,
      falJobId,
      creditsCharged,
      errorMessage,
    })
  }

  const status = lofiStatusForRun(run)
  const video = await getLofiVideo(videoId)
  const videoChanged =
    !video ||
    video.status !== status ||
    video.creditsPreAuth !== run.creditsReserved ||
    video.creditsSettled !== run.creditsConsumed

  // Every read reconciles, so this runs constantly — only write when the Run
  // actually says something the row does not.
  if (videoChanged) {
    await updateLofiVideo(videoId, {
      status,
      creditsPreAuth: run.creditsReserved,
      creditsSettled: run.creditsConsumed,
    })
  }

  // The story row is what the dashboard lists. Completion is written by the
  // sink, so only the unhappy endings are left to mirror here.
  if (videoChanged && video && (status === 'failed' || status === 'aborted')) {
    await db
      .update(stories)
      .set({ status: status === 'failed' ? 'failed' : 'draft', updatedAt: new Date() })
      .where(eq(stories.id, video.storyId))
  }

  const counts = lofiAssetCounts(run)
  await publishLofiStatus(videoId, {
    status,
    phase: lofiPhaseForRun(run),
    done: counts.ready,
    total: counts.total,
    error: run.error,
  }).catch(() => {})
}

function withRowMirror(kernel: VideoKernel): VideoKernel {
  const mirror = async (run: Run): Promise<Run> => {
    await mirrorRunToRows(run).catch(() => {})
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

export function createLofiKernel(): VideoKernel {
  return withRowMirror(
    createVideoKernel({
      fal: createFalQueue(),
      store: createPgRunStore(),
      credits: createCredits(),
      media: createLofiMediaStore(),
      sink: createLofiSink(),
      planner: createLofiPlanner({
        loadAssets: (target) => getLofiAssetsForVideo(target.videoId),
        buildRenderInput: buildLofiRenderInput,
      }),
      webhooks: videoWebhookUrls,
    }),
  )
}

// --- Operations -------------------------------------------------------------

async function rehostStockTracks(storyId: string, rows: NewLofiAssetRow[]): Promise<void> {
  const stock = rows.filter((row) => row.kind === 'stock-music' && row.resultUrl)
  await Promise.all(
    stock.map(async (row) => {
      try {
        const url = await rehostToLofiBlob({
          storyId,
          assetId: row.id,
          kind: 'stock-music',
          sourceUrl: row.resultUrl as string,
        })
        await updateLofiAsset(row.id, { resultUrl: url })
      } catch (err) {
        await updateLofiAsset(row.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )
}

/**
 * A new lofi video and the Run that fills it.
 *
 * The form's Generate always makes a new video, so this always makes a new
 * Target. Double-submit protection is per video id, which is what start, retry
 * and cancel all address — two Generates are two videos, deliberately.
 */
export async function launchLofiVideo(
  input: GenerateInput,
  userId: string,
): Promise<{ videoId: string; storyId: string }> {
  const isStock = input.category === 'lofi-stock'
  const estimate = calculateTotalCredits(
    input.musicModel,
    input.musicLoopCount,
    input.visualConfig,
  )

  // Checked before anything is written, so a user who cannot afford this is not
  // left owning an empty video.
  const balance = await getCredits(userId)
  if (balance < estimate) throw new InsufficientCreditsError(balance, estimate)

  const videoId = randomUUID()
  const storyId = randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(stories).values({
      id: storyId,
      userId,
      category: isStock ? 'lofi-stock' : 'lofi',
      status: 'draft',
      title: input.suggestedTitle,
      tagline: input.vibe.slice(0, 120),
      protagonist: '',
      storyInput: input.vibe,
      options: '{}',
    })

    await tx.insert(lofiVideos).values({
      id: videoId,
      userId,
      storyId,
      vibe: input.vibe,
      targetDurationSec: input.targetDurationSec,
      musicModel: input.musicModel,
      musicLoopCount: input.selectedTracks?.length ?? input.musicLoopCount,
      visualMode: input.visualConfig.mode,
      imageModel:
        input.visualConfig.mode === 'single-image' || input.visualConfig.mode === 'multi-image'
          ? input.visualConfig.model
          : null,
      videoModel:
        input.visualConfig.mode === 'single-video' || input.visualConfig.mode === 'multi-video'
          ? input.visualConfig.model
          : null,
      ambientBed: input.suggestedAmbientBed,
      status: 'generating',
      creditsPreAuth: estimate,
      costUsd: '0',
    })
  })

  const assetRows = buildAssetRows(videoId, input, randomUUID)
  await db.insert(lofiAssets).values(assetRows)
  if (isStock) await rehostStockTracks(storyId, assetRows)

  await createLofiKernel().start(lofiTarget(userId, videoId))

  return { videoId, storyId }
}

/** The Target's current Run without reconciling — cancel must not race a late success. */
export async function currentLofiRun(target: LofiTarget): Promise<Run | null> {
  return createPgRunStore().findCurrentByTarget(target)
}

export interface LofiVideoHydration {
  video: LofiVideoRow
  assets: LofiAssetRow[]
  run: LofiRunHydration | null
}

/**
 * The video as the page should render it, reconciled against fal first: a
 * missed asset or render webhook becomes a finished video on this read rather
 * than on whichever later one happens to have a client attached.
 */
export async function hydrateLofiVideo(
  userId: string,
  videoId: string,
): Promise<LofiVideoHydration | null> {
  const target = lofiTarget(userId, videoId)
  const run = await createLofiKernel()
    .get(target)
    .catch(() => null)

  let video = await getLofiVideoForUser(videoId, userId)
  if (!video) return null

  const orphaned = orphanedLofiStatus(video, run)
  if (orphaned) {
    await updateLofiVideo(videoId, { status: orphaned })
    video = { ...video, status: orphaned }
  }

  return {
    video,
    assets: await getLofiAssetsForVideo(videoId),
    run: run ? toLofiRunHydration(run) : null,
  }
}

export async function cancelLofiVideo(userId: string, videoId: string): Promise<Run | null> {
  const current = await currentLofiRun(lofiTarget(userId, videoId))
  if (!current || !isInFlight(current)) return current
  return createLofiKernel().cancel(current.id)
}

/**
 * Retry this video's failed Run. Assets that are ready stay ready, so the
 * render re-runs on music already paid for and only the loops that produced
 * nothing are charged again.
 */
export async function retryLofiVideo(userId: string, videoId: string): Promise<Run> {
  const current = await currentLofiRun(lofiTarget(userId, videoId))
  if (!current) throw new RunNotFoundError(videoId)
  if (isInFlight(current)) return current

  const offer = lofiRetryOffer(current)
  if (!offer.retryable) throw new Error(offer.reason ?? 'This video cannot be retried')

  return createLofiKernel().retry(current.id)
}

export interface RecomposeInput {
  selectedTracks?: import('./lofi-adapters').FreetouseTrackRef[]
  musicModel: string
  musicLoopCount: number
  visualPrompts: string[]
  visualConfig: import('@/shared/lib/types').VisualConfig
  isStock: boolean
}

/**
 * Re-generate this video's assets and render again. The previous Run is
 * terminal by the time this is allowed, so this is a new Run on the same
 * Target — and, like any start, it reserves credits for the work it will do.
 */
export async function recomposeLofiVideo(
  videoId: string,
  userId: string,
  input: RecomposeInput,
): Promise<void> {
  const video = await getLofiVideoForUser(videoId, userId)
  if (!video) throw new Error('Video not found')

  const current = await currentLofiRun(lofiTarget(userId, videoId))
  if (current && isInFlight(current)) {
    throw new Error('Video must be in terminal state to recompose')
  }

  const generateInput: GenerateInput = {
    vibe: video.vibe,
    targetDurationSec: video.targetDurationSec,
    musicModel: input.musicModel,
    musicLoopCount: input.musicLoopCount,
    visualConfig: input.visualConfig,
    musicPrompts: [],
    visualPrompts: input.visualPrompts,
    suggestedTitle: '',
    suggestedAmbientBed: null,
    category: input.isStock ? 'lofi-stock' : 'lofi',
    selectedTracks: input.selectedTracks,
  }

  const estimate = calculateTotalCredits(
    input.musicModel,
    input.musicLoopCount,
    input.visualConfig,
  )
  const balance = await getCredits(userId)
  if (balance < estimate) throw new InsufficientCreditsError(balance, estimate)

  await db.delete(lofiAssets).where(eq(lofiAssets.videoId, videoId))
  const assetRows = buildAssetRows(videoId, generateInput, randomUUID)
  await db.insert(lofiAssets).values(assetRows)

  await db
    .update(lofiVideos)
    .set({
      status: 'generating',
      arrangementJson: null,
      finalVideoUrl: null,
      finalDurationSec: null,
      musicLoopCount: input.selectedTracks?.length ?? input.musicLoopCount,
      updatedAt: new Date(),
    })
    .where(and(eq(lofiVideos.id, videoId), eq(lofiVideos.userId, userId)))

  await db
    .update(stories)
    .set({ status: 'draft', composedVideoUrl: null, updatedAt: new Date() })
    .where(eq(stories.id, video.storyId))

  if (input.isStock) await rehostStockTracks(video.storyId, assetRows)

  await createLofiKernel().start(lofiTarget(userId, videoId))
}
