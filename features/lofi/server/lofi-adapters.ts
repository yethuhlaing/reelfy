/**
 * Lofi planner and projections for the Video processing kernel.
 *
 * The lofi video is the Target. Every music loop and visual fal has to make is
 * an `asset` Step in stage 0, and the ffmpeg compose that stitches them
 * together is the one `render` Step in stage 1 — one Run, so leaving during
 * asset generation is the same contract as leaving during the final render.
 *
 * Loaders are injected so this can be exercised without Postgres or fal.
 */

import type { lofiAssets, lofiVideos } from '@/shared/lib/db/schema'
import { getMusicProvider } from '@/shared/lib/providers/audio/music'
import { getImageProvider } from '@/shared/lib/providers/image/image'
import { getVideoProvider } from '@/shared/lib/providers/video/video'
import { lofiVisualImageRequest } from '@/shared/lib/prompts/lofi-visual-image'
import type { VisualConfig, VisualMode } from '@/shared/lib/types'
import type {
  Run,
  RunPlanner,
  Step,
  StepPlan,
  TargetRef,
} from '@/shared/lib/video-processing/types'
import { isInFlight, isStepSettled } from '@/shared/lib/video-processing/types'

import type {
  LofiRunHydration,
  LofiRunPhase,
  LofiVideoStatus,
} from '@/features/lofi/lib/lofi-run-view'
import {
  buildArrangementPlan,
  buildTracksPayload,
  type BuildPlanInput,
  type ReadyMusicAsset,
  type ReadyVisualAsset,
} from './arrangement'
import type { LofiAssetKind } from './lofi-blob-assets'
import {
  calculateAssetCostUsd,
  calculateAssetCredits,
  MIN_MUSIC_LOOPS,
  RENDER_CREDITS,
} from './pricing'

export const LOFI_RENDER_MODEL_ID = 'fal-ai/ffmpeg-api/compose'

export type LofiTarget = Extract<TargetRef, { kind: 'lofiVideo' }>
export type LofiAssetRow = typeof lofiAssets.$inferSelect
export type LofiVideoRow = typeof lofiVideos.$inferSelect
export type NewLofiAssetRow = typeof lofiAssets.$inferInsert

export function lofiTarget(userId: string, videoId: string): LofiTarget {
  return { kind: 'lofiVideo', userId, videoId }
}

export function requireLofiTarget(target: TargetRef, what: string): LofiTarget {
  if (target.kind !== 'lofiVideo') {
    throw new Error(`Lofi ${what} received a ${target.kind} Target`)
  }
  return target
}

// --- Asset rows -------------------------------------------------------------

export interface FreetouseTrackRef {
  id: string
  title: string
  mp3Url: string
  duration_sec: number
  genre?: string
  artist_name?: string
}

export interface GenerateInput {
  vibe: string
  targetDurationSec: number
  musicModel: string
  musicLoopCount: number
  visualConfig: VisualConfig
  musicPrompts: string[]
  visualPrompts: string[]
  suggestedTitle: string
  suggestedAmbientBed: string | null
  category?: 'lofi' | 'lofi-stock'
  selectedTracks?: FreetouseTrackRef[]
}

/** A visual model that answers with a still rather than a clip. */
export function isImageModel(model: string): boolean {
  return model.includes('flux') || model.includes('gemini') || model.includes('sdxl')
}

export function toLofiAssetKind(kind: string): LofiAssetKind {
  if (kind === 'stock-music') return 'stock-music'
  if (kind === 'music') return 'music'
  return 'visual'
}

export function buildAssetRows(
  videoId: string,
  input: GenerateInput,
  newId: () => string,
): NewLofiAssetRow[] {
  const isStock = input.category === 'lofi-stock'
  const rows: NewLofiAssetRow[] = []

  if (isStock && input.selectedTracks) {
    input.selectedTracks.forEach((track, index) => {
      rows.push({
        id: newId(),
        videoId,
        kind: 'stock-music',
        orderIndex: index,
        prompt: track.title,
        model: 'freetouse',
        durationSec: Math.round(track.duration_sec),
        costUsd: '0',
        // Picked, not generated: a stock track is ready the moment it is chosen,
        // which is why it is never a Step.
        status: 'ready',
        creditsCharged: 0,
        resultUrl: track.mp3Url,
        sourceProvider: 'freetouse',
        sourceTrackId: track.id,
        sourceLicence: 'Free To Use License (freetouse.com) — free for personal use',
        sourceAttribution: null,
      })
    })
  } else {
    const musicProvider = getMusicProvider(input.musicModel)
    input.musicPrompts.forEach((prompt, index) => {
      rows.push({
        id: newId(),
        videoId,
        kind: 'music',
        orderIndex: index,
        prompt,
        model: input.musicModel,
        durationSec: musicProvider.defaultDurationSec,
        costUsd: String(musicProvider.costPerLoopUsd),
      })
    })
  }

  const musicCount = input.selectedTracks?.length ?? input.musicPrompts.length
  input.visualPrompts.forEach((prompt, index) => {
    const model = input.visualConfig.model || 'flux-schnell-fal'
    rows.push({
      id: newId(),
      videoId,
      kind: 'visual',
      orderIndex: musicCount + index,
      prompt,
      model,
      durationSec: input.visualConfig.assets[index]?.durationSec ?? 5,
      costUsd: calculateAssetCostUsd(model),
    })
  })

  return rows
}

// --- Planner ----------------------------------------------------------------

export function assetStepPlan(asset: LofiAssetRow): StepPlan {
  const credits = calculateAssetCredits(asset.model, asset.kind)

  if (asset.kind === 'music') {
    const provider = getMusicProvider(asset.model)
    return {
      kind: 'asset',
      stage: 0,
      ref: asset.id,
      endpoint: provider.falModel,
      credits,
      // One loop fal will not produce is not a dead video. How many loops are
      // enough is a rule about the whole set, so it is checked once, where the
      // render input is built.
      optional: true,
      buildInput: () =>
        provider.queueInput({ prompt: asset.prompt, durationSec: asset.durationSec }),
    }
  }

  if (isImageModel(asset.model)) {
    const provider = getImageProvider(asset.model)
    return {
      kind: 'asset',
      stage: 0,
      ref: asset.id,
      endpoint: provider.falModel,
      credits,
      buildInput: () =>
        provider.queueInput(lofiVisualImageRequest(asset.prompt), {
          aspectRatio: '16:9',
          resolution: '1920x1080',
        }),
    }
  }

  const provider = getVideoProvider(asset.model)
  return {
    kind: 'asset',
    stage: 0,
    ref: asset.id,
    endpoint: provider.falModel,
    credits,
    buildInput: () => provider.queueInput('', asset.prompt, { width: 1920, height: 1080 }),
  }
}

/**
 * One Step per asset fal has to generate, then the render.
 *
 * The plan has to line up with the Run's Steps on every converge, so it is a
 * function of the asset rows alone — never of how far along they are.
 */
export function createLofiPlanner(deps: {
  loadAssets: (target: LofiTarget) => Promise<LofiAssetRow[]>
  buildRenderInput: (target: LofiTarget, run: Run) => Promise<Record<string, unknown>>
}): RunPlanner {
  return {
    async plan(rawTarget: TargetRef) {
      const target = requireLofiTarget(rawTarget, 'planner')
      const assets = await deps.loadAssets(target)
      if (assets.length === 0) throw new Error('This video has no assets to generate')

      const steps: StepPlan[] = assets
        .filter((asset) => asset.kind !== 'stock-music')
        .map(assetStepPlan)

      steps.push({
        kind: 'render',
        stage: 1,
        endpoint: LOFI_RENDER_MODEL_ID,
        credits: RENDER_CREDITS,
        buildInput: ({ run }) => deps.buildRenderInput(target, run),
      })

      return { steps }
    },
  }
}

// --- Render input -----------------------------------------------------------

/** Rehosted URL per asset row, taken from the Steps rather than from the rows. */
export function resultUrlByAsset(run: Run): Map<string, string> {
  const urls = new Map<string, string>()
  for (const step of run.steps) {
    if (step.status === 'completed' && step.ref && step.resultUrl) {
      urls.set(step.ref, step.resultUrl)
    }
  }
  return urls
}

export interface ReadyLofiAssets {
  musicLoops: ReadyMusicAsset[]
  visualAssets: ReadyVisualAsset[]
  plannedMusic: number
  plannedVisual: number
}

/**
 * What the Run actually produced.
 *
 * The Steps are the truth and the rows are metadata, because the row mirror
 * runs once an operation returns — and the render Step is built during one.
 */
export function readyLofiAssets(assets: LofiAssetRow[], run: Run): ReadyLofiAssets {
  const urls = resultUrlByAsset(run)
  const musicLoops: ReadyMusicAsset[] = []
  const visualAssets: ReadyVisualAsset[] = []
  let plannedMusic = 0
  let plannedVisual = 0

  for (const asset of assets) {
    const isMusic = asset.kind === 'music' || asset.kind === 'stock-music'
    if (isMusic) plannedMusic += 1
    else plannedVisual += 1

    const url =
      asset.kind === 'stock-music'
        ? asset.status === 'ready'
          ? asset.resultUrl
          : null
        : (urls.get(asset.id) ?? null)
    if (!url) continue

    if (isMusic) {
      musicLoops.push({ url, lengthSec: asset.durationSec, orderIndex: asset.orderIndex })
    } else {
      visualAssets.push({ url, durationSec: asset.durationSec, orderIndex: asset.orderIndex })
    }
  }

  return { musicLoops, visualAssets, plannedMusic, plannedVisual }
}

/**
 * How many loops the render insists on: a share of what was planned, but never
 * more than was planned — asking ten loops of a five-loop video could never be
 * met, and the video would fail no matter how well fal did.
 */
export function requiredMusicLoops(plannedMusic: number, minSuccessRate: number): number {
  if (plannedMusic === 0) return 0
  return Math.min(plannedMusic, Math.max(Math.ceil(plannedMusic * minSuccessRate), MIN_MUSIC_LOOPS))
}

/**
 * The gate, stated as an error rather than as a state.
 *
 * Throwing here fails the Run with a reason the user can read and retry from,
 * instead of parking the video in an "arranging" status nothing moves it out of.
 */
export function assertLofiRenderable(ready: ReadyLofiAssets, minSuccessRate: number): void {
  if (ready.visualAssets.length < ready.plannedVisual) {
    throw new Error(
      `Only ${ready.visualAssets.length} of ${ready.plannedVisual} visuals were generated`,
    )
  }
  if (ready.musicLoops.length === 0) {
    throw new Error('No music was generated, so there is nothing to render')
  }
  const required = requiredMusicLoops(ready.plannedMusic, minSuccessRate)
  if (ready.musicLoops.length < required) {
    throw new Error(
      `Only ${ready.musicLoops.length} of ${ready.plannedMusic} music tracks were generated — ${required} are needed to render`,
    )
  }
}

/**
 * Whether the visuals are stills or clips. The stored mode can disagree with
 * what was generated (a user can pick an image model where the plan suggested
 * video), so the files win.
 */
export function effectiveVisualMode(visualAssets: ReadyVisualAsset[]): VisualMode {
  const isImages =
    visualAssets.length > 0 && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(visualAssets[0].url)
  if (visualAssets.length > 1) return isImages ? 'multi-image' : 'multi-video'
  return isImages ? 'single-image' : 'single-video'
}

export function buildLofiComposeInput(
  video: { id: string; targetDurationSec: number },
  ready: ReadyLofiAssets,
): { tracks: ReturnType<typeof buildTracksPayload>; arrangementJson: string } {
  const planInput: BuildPlanInput = {
    targetDurationSec: video.targetDurationSec,
    videoId: video.id,
    musicLoops: ready.musicLoops,
    visualAssets: ready.visualAssets,
    visualMode: effectiveVisualMode(ready.visualAssets),
    ambientBedUrl: null,
  }
  const plan = buildArrangementPlan(planInput)
  return { tracks: buildTracksPayload(plan), arrangementJson: JSON.stringify(plan) }
}

// --- Projections ------------------------------------------------------------

export function lofiPhaseForRun(run: Run): LofiRunPhase | null {
  if (!isInFlight(run)) return null
  const waiting = run.steps.filter((step) => !isStepSettled(step))
  const lowest = waiting.reduce<number | null>(
    (stage, step) => (stage === null || step.stage < stage ? step.stage : stage),
    null,
  )
  const current = lowest === null ? undefined : waiting.find((step) => step.stage === lowest)
  if (!current) return null
  return current.kind === 'render' ? 'rendering' : 'generating_assets'
}

/** The video's own status column, projected from the Run rather than tracked twice. */
export function lofiStatusForRun(run: Run): LofiVideoStatus {
  if (isInFlight(run)) return lofiPhaseForRun(run) === 'rendering' ? 'rendering' : 'generating'
  if (run.status === 'completed') return 'complete'
  if (run.status === 'aborted') return 'aborted'
  return 'failed'
}

export function lofiAssetCounts(run: Run): { ready: number; total: number } {
  const assets = run.steps.filter((step) => step.kind === 'asset')
  return {
    ready: assets.filter((step) => step.status === 'completed').length,
    total: assets.length,
  }
}

/**
 * Whether Retry is on offer, and why not when it is not.
 *
 * Cancelling was a decision, so an aborted Run is not retryable — the way back
 * is a new generation. A failed Run is, and retrying replays the render plus
 * whatever produced nothing, charging only for what runs again.
 */
export function lofiRetryOffer(run: Run): { retryable: boolean; reason?: string } {
  if (run.status === 'aborted') {
    return {
      retryable: false,
      reason: 'This generation was cancelled. Recompose below to start a new one.',
    }
  }
  if (run.status !== 'failed') return { retryable: false }
  if (run.retryable === false) {
    return { retryable: false, reason: run.error ?? 'This failure cannot be retried.' }
  }
  return { retryable: true }
}

export function toLofiRunHydration(run: Run): LofiRunHydration | null {
  if (isInFlight(run)) {
    return {
      runId: run.id,
      status: 'running',
      phase: lofiPhaseForRun(run),
      error: run.error,
      retryable: false,
    }
  }
  if (run.status === 'failed' || run.status === 'aborted') {
    const offer = lofiRetryOffer(run)
    return {
      runId: run.id,
      status: run.status === 'failed' ? 'failed' : 'aborted',
      phase: null,
      error: run.error,
      retryable: offer.retryable,
      retryBlockedReason: offer.reason,
    }
  }
  return null
}

/** How an asset row should read, given the Step that is filling it. */
export const LOFI_ASSET_STATUS_BY_STEP: Record<Step['status'], string> = {
  pending: 'pending',
  running: 'submitted',
  completed: 'ready',
  failed: 'failed',
  skipped: 'skipped',
  aborted: 'skipped',
}

/**
 * A video claiming to generate with no Run behind it predates the kernel, or
 * died before its Run reached the store. Nothing will ever finish it, so it
 * settles instead of spinning.
 */
export function orphanedLofiStatus(
  video: { status: string; finalVideoUrl: string | null },
  run: Run | null,
): LofiVideoStatus | null {
  if (run) return null
  if (!['generating', 'gating', 'rendering'].includes(video.status)) return null
  return video.finalVideoUrl ? 'complete' : 'failed'
}

/** Ready / total across a video's asset rows, for a page that has rows but no Run. */
export function assetProgressFromRows(assets: { kind: string; status: string }[]) {
  const music = assets.filter((a) => a.kind === 'music' || a.kind === 'stock-music')
  const visual = assets.filter((a) => a.kind === 'visual')
  const musicReady = music.filter((a) => a.status === 'ready').length
  const visualReady = visual.filter((a) => a.status === 'ready').length
  const total = music.length + visual.length
  const ready = musicReady + visualReady
  return {
    musicReady,
    musicTotal: music.length,
    visualReady,
    visualTotal: visual.length,
    overallPct: total > 0 ? Math.round((ready / total) * 100) : 0,
  }
}
