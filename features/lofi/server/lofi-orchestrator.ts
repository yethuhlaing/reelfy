import { randomUUID } from 'node:crypto'
import { after } from 'next/server'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, stories } from '@/shared/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { deductCredits, getCredits } from '@/shared/lib/db/credits'
import { fal } from '@/shared/lib/providers/fal'
import { lofiVisualImageRequest } from '@/shared/lib/prompts/lofi-visual-image'

import { logApiCost } from '@/shared/lib/db/cost-logger'
import {
  getLofiVideo,
  getLofiAssetsForVideo,
  getAssetFanInCounts,
  claimVideoForRendering,
  updateLofiVideo,
  updateLofiAsset,
  finalizeLofiVideo,
} from './lofi-db'
import { uploadComposedVideo } from '@/features/stories/server/story-assets'
import {
  rehostToLofiBlob,
  uploadLofiAsset,
  downloadToBuffer,
  type LofiAssetKind,
} from './lofi-blob-assets'
import { buildArrangementPlan, buildTracksPayload, type BuildPlanInput } from './arrangement'
import { redis } from '@/shared/lib/integrations/redis'
import {
  calculateTotalCredits,
  calculateAssetCredits,
  calculateAssetCostUsd,
  settleCredits,
  getLofiMinSuccessRate,
  RENDER_CREDITS,
  MIN_MUSIC_LOOPS,
} from './pricing'
import type { VisualMode, VisualConfig } from '@/shared/lib/types'
import { webhookBaseUrl } from '@/shared/lib/env'
import { getMusicProvider } from '@/shared/lib/providers/audio/music'
import { getImageProvider } from '@/shared/lib/providers/image/image'
import { getVideoProvider } from '@/shared/lib/providers/video/video'

const VIDEO_STATUS_TTL = 3600

async function publishVideoStatus(videoId: string, status: string, extra?: Record<string, unknown>) {
  await redis.set(
    `lofi:video:${videoId}:status`,
    JSON.stringify({ status, ts: Date.now(), ...extra }),
    { ex: VIDEO_STATUS_TTL },
  )
}

export const MAX_RETRIES = 3

export class InsufficientCreditsError extends Error {
  constructor(balance: number, required: number) {
    super(`Insufficient credits: have ${balance}, need ${required}`)
    this.name = 'InsufficientCreditsError'
  }
}

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

async function preAuthCredits(userId: string, amount: number): Promise<void> {
  const balance = await getCredits(userId)
  if (balance < amount) {
    throw new InsufficientCreditsError(balance, amount)
  }
  const result = await deductCredits(userId, amount)
  if (!result.ok) {
    throw new InsufficientCreditsError(result.balance, amount)
  }
}

type AssetRow = {
  id: string
  videoId: string
  kind: string
  orderIndex: number
  prompt: string
  model: string
  durationSec: number
  costUsd: string
  status?: string
  creditsCharged?: number
  resultUrl?: string | null
  sourceProvider?: string | null
  sourceTrackId?: string | null
  sourceLicence?: string | null
  sourceAttribution?: string | null
}

function buildAssetRows(videoId: string, input: GenerateInput) {
  const isStock = input.category === 'lofi-stock'
  const rows: AssetRow[] = []

  if (isStock && input.selectedTracks) {
    for (let i = 0; i < input.selectedTracks.length; i++) {
      const track = input.selectedTracks[i]
      rows.push({
        id: randomUUID(),
        videoId,
        kind: 'stock-music',
        orderIndex: i,
        prompt: track.title,
        model: 'freetouse',
        durationSec: Math.round(track.duration_sec),
        costUsd: '0',
        status: 'ready',
        creditsCharged: 0,
        resultUrl: track.mp3Url,
        sourceProvider: 'freetouse',
        sourceTrackId: track.id,
        sourceLicence: 'Free To Use License (freetouse.com) — free for personal use',
        sourceAttribution: null,
      })
    }
  } else {
    const musicProvider = getMusicProvider(input.musicModel)
    for (let i = 0; i < input.musicPrompts.length; i++) {
      rows.push({
        id: randomUUID(),
        videoId,
        kind: 'music',
        orderIndex: i,
        prompt: input.musicPrompts[i],
        model: input.musicModel,
        durationSec: musicProvider.defaultDurationSec,
        costUsd: String(musicProvider.costPerLoopUsd),
      })
    }
  }

  for (let i = 0; i < input.visualPrompts.length; i++) {
    const durationSec = input.visualConfig.assets[i]?.durationSec ?? 5
    const model = input.visualConfig.model || 'flux-schnell-fal'
    rows.push({
      id: randomUUID(),
      videoId,
      kind: 'visual',
      orderIndex: (input.selectedTracks?.length ?? input.musicPrompts.length) + i,
      prompt: input.visualPrompts[i],
      model,
      durationSec,
      costUsd: calculateAssetCostUsd(model),
    })
  }

  return rows
}

function toLofiAssetKind(kind: string): LofiAssetKind {
  if (kind === 'stock-music') return 'stock-music'
  if (kind === 'music') return 'music'
  return 'visual'
}

type VisualSubmitResult =
  | { type: 'async'; jobId: string; estimatedCostUsd: number }
  | { type: 'sync'; resultUrl: string; estimatedCostUsd: number }

async function submitVisual(
  asset: { id: string; prompt: string; model: string; durationSec: number },
  storyId: string,
  baseUrl: string,
): Promise<VisualSubmitResult> {
  const isImage = asset.model.includes('flux') || asset.model.includes('gemini') || asset.model.includes('sdxl')
  const webhookUrl = `${baseUrl}/api/webhooks/fal/lofi/asset/${asset.id}`

  if (isImage) {
    const provider = getImageProvider(asset.model)
    const result = await provider.generate(lofiVisualImageRequest(asset.prompt), {
      aspectRatio: '16:9',
      resolution: '1920x1080',
    })
    const resultUrl = await uploadLofiAsset({
      storyId,
      assetId: asset.id,
      kind: 'visual',
      data: result.data,
      contentType: result.mimeType,
    })
    return { type: 'sync', resultUrl, estimatedCostUsd: provider.costEstimateUsd }
  }

  const provider = getVideoProvider(asset.model)
  const { requestId } = await provider.enqueue(
    '',
    asset.prompt,
    { width: 1920, height: 1080 },
    webhookUrl,
  )
  return { type: 'async', jobId: requestId, estimatedCostUsd: provider.costEstimateUsd }
}

async function persistVisualSubmit(
  asset: { id: string; model: string; kind: string },
  result: VisualSubmitResult,
): Promise<void> {
  if (result.type === 'sync') {
    const credits = calculateAssetCredits(asset.model, asset.kind)
    await updateLofiAsset(asset.id, {
      status: 'ready',
      resultUrl: result.resultUrl,
      creditsCharged: credits,
      costUsd: String(result.estimatedCostUsd),
    })
    return
  }
  await updateLofiAsset(asset.id, {
    falJobId: result.jobId,
    status: 'submitted',
    costUsd: String(result.estimatedCostUsd),
  })
}

async function rehostStockMusicAssets(
  storyId: string,
  rows: AssetRow[],
): Promise<void> {
  const stockRows = rows.filter((row) => row.kind === 'stock-music' && row.resultUrl)
  await Promise.all(
    stockRows.map(async (row) => {
      try {
        const url = await rehostToLofiBlob({
          storyId,
          assetId: row.id,
          kind: 'stock-music',
          sourceUrl: row.resultUrl!,
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

async function refundCreditsDirect(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return
  await db.execute(
    sql`UPDATE "user" SET credits = credits + ${amount} WHERE id = ${userId}`,
  )
}

async function logStageTransition(
  videoId: string,
  userId: string,
  prevStatus: string,
  newStatus: string,
  detail?: string,
) {
  console.log(`[lofi] video=${videoId} user=${userId} ${prevStatus}→${newStatus}${detail ? `: ${detail}` : ''}`)
}

async function submitAssets(
  videoId: string,
  storyId: string,
  assetRows: AssetRow[],
  isStock: boolean,
  baseUrl: string,
) {
  if (isStock) {
    await rehostStockMusicAssets(storyId, assetRows)
  }

  const submittable = assetRows.filter((row) => row.kind !== 'stock-music')
  await Promise.all(
    submittable.map(async (row) => {
      try {
        if (row.kind === 'music') {
          const provider = getMusicProvider(row.model)
          const result = await provider.submit({
            prompt: row.prompt,
            durationSec: row.durationSec,
            webhookUrl: `${baseUrl}/api/webhooks/fal/lofi/asset/${row.id}`,
          })
          await updateLofiAsset(row.id, {
            falJobId: result.jobId,
            status: 'submitted',
            costUsd: String(result.estimatedCostUsd),
          })
        } else {
          const result = await submitVisual(row, storyId, baseUrl)
          await persistVisualSubmit(row, result)
          if (result.type === 'sync') {
            await maybeAdvanceVideo(videoId)
          }
        }
      } catch (err) {
        console.error(`Asset ${row.id} (${row.kind}) submit failed`, err)
        await updateLofiAsset(row.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )

  if (isStock) {
    await maybeAdvanceVideo(videoId)
  }
}

export async function launchVideo(input: GenerateInput, userId: string) {
  const isStock = input.category === 'lofi-stock'
  const totalCredits = calculateTotalCredits(input.musicModel, input.musicLoopCount, input.visualConfig)
  await preAuthCredits(userId, totalCredits)

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
      imageModel: (input.visualConfig.mode === 'single-image' || input.visualConfig.mode === 'multi-image') ? input.visualConfig.model : null,
      videoModel: (input.visualConfig.mode === 'single-video' || input.visualConfig.mode === 'multi-video') ? input.visualConfig.model : null,
      ambientBed: input.suggestedAmbientBed,
      status: 'generating',
      creditsPreAuth: totalCredits,
      costUsd: '0',
    })
  })

  await logStageTransition(videoId, userId, 'planning', 'generating')

  const assetRows = buildAssetRows(videoId, input)
  await db.insert(lofiAssets).values(assetRows)

  const baseUrl = webhookBaseUrl()

  after(async () => {
    try {
      await submitAssets(videoId, storyId, assetRows, isStock, baseUrl)
    } catch (err) {
      console.error(`[lofi] background submit failed for ${videoId}`, err)
    }
  })

  return { videoId, storyId }
}

export interface FalWebhookPayload {
  status?: string
  error?: string
  payload?: Record<string, unknown>
}

function extractError(body: FalWebhookPayload): string {
  return body.error ?? body.status ?? 'unknown error'
}

function extractResultUrl(body: FalWebhookPayload): string | null {
  const payload = body.payload
  if (!payload) return null
  const video = payload.video as { url?: string } | undefined
  if (video?.url) return video.url
  const audio = payload.audio as { url?: string } | undefined
  if (audio?.url) return audio.url
  const images = payload.images as { url: string }[] | undefined
  if (images?.[0]?.url) return images[0].url
  const image = payload.image as { url?: string } | undefined
  if (image?.url) return image.url
  return null
}

async function retryBackoff(attempt: number): Promise<void> {
  const delays = [0, 5000, 15000]
  const delay = delays[attempt] ?? 30000
  if (delay > 0) {
    await new Promise(r => setTimeout(r, delay))
  }
}

async function retryAsset(asset: {
  id: string
  videoId: string
  kind: string
  prompt: string
  model: string
  durationSec: number
  retryCount: number
}) {
  await retryBackoff(asset.retryCount)
  await updateLofiAsset(asset.id, { retryCount: asset.retryCount + 1 })

  const video = await getLofiVideo(asset.videoId)
  if (!video) return

  const baseUrl = webhookBaseUrl()
  const webhookUrl = `${baseUrl}/api/webhooks/fal/lofi/asset/${asset.id}`

  try {
    if (asset.kind === 'music') {
      const provider = getMusicProvider(asset.model)
      const result = await provider.submit({
        prompt: asset.prompt,
        durationSec: asset.durationSec,
        webhookUrl,
      })
      await updateLofiAsset(asset.id, {
        falJobId: result.jobId,
        status: 'submitted',
        costUsd: String(result.estimatedCostUsd),
      })
    } else {
      const result = await submitVisual(asset, video.storyId, baseUrl)
      await persistVisualSubmit(asset, result)
      if (result.type === 'sync') {
        await maybeAdvanceVideo(asset.videoId)
      }
    }
  } catch (err) {
    await updateLofiAsset(asset.id, {
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function handleAssetWebhook(assetId: string, body: FalWebhookPayload) {
  const asset = await db.query.lofiAssets.findFirst({ where: eq(lofiAssets.id, assetId) })
  if (!asset || ['ready', 'skipped', 'failed'].includes(asset.status)) return

  const video = await getLofiVideo(asset.videoId)
  if (!video) return
  if (video.status === 'aborted') return

  if (body.status === 'ERROR' || body.error) {
    if (asset.retryCount < MAX_RETRIES) {
      await retryAsset(asset)
      return
    }
    await updateLofiAsset(asset.id, {
      status: 'failed',
      errorMessage: extractError(body),
    })
  } else {
    const sourceUrl = extractResultUrl(body)
    if (!sourceUrl) {
      if (asset.retryCount < MAX_RETRIES) {
        await retryAsset(asset)
        return
      }
      await updateLofiAsset(asset.id, {
        status: 'failed',
        errorMessage: 'Webhook payload missing result URL',
      })
    } else {
      try {
        const url = await rehostToLofiBlob({
          storyId: video.storyId,
          assetId: asset.id,
          kind: toLofiAssetKind(asset.kind),
          sourceUrl,
        })
        const credits = calculateAssetCredits(asset.model, asset.kind)
        await updateLofiAsset(asset.id, { status: 'ready', resultUrl: url, creditsCharged: credits })
      } catch (err) {
        if (asset.retryCount < MAX_RETRIES) {
          await retryAsset(asset)
          return
        }
        await updateLofiAsset(asset.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Download failed',
        })
      }
    }
  }

  await maybeAdvanceVideo(asset.videoId)
}

interface GateResult {
  proceed: boolean
  reason?: string
}

async function evaluateGate(videoId: string): Promise<GateResult> {
  const assets = await getLofiAssetsForVideo(videoId)

  const music = assets.filter(a => a.kind === 'music')
  const stockMusic = assets.filter(a => a.kind === 'stock-music')
  const visual = assets.filter(a => a.kind === 'visual')

  const hasAiMusic = music.length > 0
  const hasStockMusic = stockMusic.length > 0
  const visualReady = visual.filter(a => a.status === 'ready' || a.status === 'skipped')

  if (visualReady.length < visual.length) {
    return { proceed: false, reason: 'visual_incomplete' }
  }

  if (hasAiMusic) {
    const musicReady = music.filter(a => a.status === 'ready')
    if (musicReady.length / music.length < 0.8) {
      return { proceed: false, reason: 'music_below_threshold' }
    }
    if (musicReady.length < MIN_MUSIC_LOOPS) {
      return { proceed: false, reason: 'music_insufficient_count' }
    }
  }

  if (hasStockMusic) {
    // Stock music assets are born 'ready', so they should all be ready.
    // If any failed, evaluate below.
    const stockReady = stockMusic.filter(a => a.status === 'ready')
    if (stockReady.length < stockMusic.length) {
      return { proceed: false, reason: 'stock_music_incomplete' }
    }
  }

  if (!hasAiMusic && !hasStockMusic) {
    return { proceed: false, reason: 'no_music_assets' }
  }

  return { proceed: true }
}

async function markFailedAssetsSkipped(videoId: string) {
  await db.update(lofiAssets)
    .set({ status: 'skipped' })
    .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'failed')))
}

async function maybeAdvanceVideo(videoId: string) {
  const counts = await getAssetFanInCounts(videoId)
  if (!counts) return

  const { total, done } = counts
  await publishVideoStatus(videoId, 'generating', { done, total })
  if (done < total) return

  const video = await getLofiVideo(videoId)
  if (!video || video.status !== 'generating') return

  const gate = await evaluateGate(videoId)
  if (!gate.proceed) {
    console.error(`[lofi] gate failed for ${videoId}: ${gate.reason}`)
    const readySum = await db
      .select({ sum: sql<number>`coalesce(sum(${lofiAssets.creditsCharged}), 0)` })
      .from(lofiAssets)
      .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'ready')))

    const refund = video.creditsPreAuth - (readySum[0]?.sum ?? 0)
    await failVideoAndRefund(videoId, video.userId, refund, gate.reason)
    return
  }

  await markFailedAssetsSkipped(videoId)

  const claimed = await claimVideoForRendering(videoId)
  if (!claimed) return

  await logStageTransition(videoId, video.userId, 'generating', 'rendering')
  await runArrangementAndRender(videoId)
}

async function failVideoAndRefund(videoId: string, userId?: string, refundAmount?: number, reason?: string) {
  await db.transaction(async (tx) => {
    await tx.update(lofiVideos)
      .set({ status: 'failed' })
      .where(eq(lofiVideos.id, videoId))
    await tx.update(stories)
      .set({ status: 'failed' })
      .where(eq(stories.id, (await getLofiVideo(videoId))?.storyId ?? ''))
  })

  if (userId && refundAmount && refundAmount > 0) {
    await db.execute(
      sql`UPDATE "user" SET credits = credits + ${refundAmount} WHERE id = ${userId}`,
    )
  }

  if (userId) {
    await logStageTransition(videoId, userId, 'unknown', 'failed', reason)
  }
}

async function loadReadyAssets(videoId: string) {
  const assets = await getLofiAssetsForVideo(videoId)
  return {
    musicLoops: assets
      .filter(a => (a.kind === 'music' || a.kind === 'stock-music') && a.status === 'ready' && a.resultUrl)
      .map(a => ({ url: a.resultUrl!, lengthSec: a.durationSec, orderIndex: a.orderIndex })),
    visualAssets: assets
      .filter(a => a.kind === 'visual' && a.status === 'ready' && a.resultUrl)
      .map(a => ({ url: a.resultUrl!, durationSec: a.durationSec, orderIndex: a.orderIndex })),
  }
}

async function runArrangementAndRender(videoId: string) {
  const video = await getLofiVideo(videoId)
  if (!video) throw new Error(`Video ${videoId} not found`)

  const { musicLoops, visualAssets } = await loadReadyAssets(videoId)

  console.log(`[lofi] render assets: video=${videoId} music=${musicLoops.length} visuals=${visualAssets.length} dbMode=${video.visualMode}`)

  if (musicLoops.length === 0) {
    await failVideoAndRefund(videoId, video.userId, 0, 'no_ready_music')
    return
  }

  // Infer mode from actual assets — DB mode may mismatch if user picked an image model
  // but the LLM suggested a video mode (or vice versa).
  const isImageAssets = visualAssets.length > 0 && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(visualAssets[0].url)
  let effectiveVisualMode: VisualMode
  if (visualAssets.length > 1) {
    effectiveVisualMode = isImageAssets ? 'multi-image' : 'multi-video'
  } else {
    effectiveVisualMode = isImageAssets ? 'single-image' : 'single-video'
  }
  console.log(`[lofi] render mode: inferred=${effectiveVisualMode} from ${visualAssets[0]?.url?.split('/').pop() ?? 'none'}`)

  const planInput: BuildPlanInput = {
    targetDurationSec: video.targetDurationSec,
    videoId: video.id,
    musicLoops,
    visualAssets,
    visualMode: effectiveVisualMode,
    ambientBedUrl: null,
  }

  const plan = buildArrangementPlan(planInput)
  const planJson = JSON.stringify(plan)

  await updateLofiVideo(videoId, { arrangementJson: planJson } as any)

  const tracks = buildTracksPayload(plan)
  const baseUrl = webhookBaseUrl()

  try {
    await fal.queue.submit('fal-ai/ffmpeg-api/compose', {
      input: { tracks } as any,
      webhookUrl: `${baseUrl}/api/webhooks/fal/lofi/render/${videoId}`,
    })
    await publishVideoStatus(videoId, 'rendering')
  } catch (err) {
    console.error('Render submit failed', err)
    await updateLofiVideo(videoId, { status: 'failed' } as any)
    await publishVideoStatus(videoId, 'failed')
    await logStageTransition(videoId, video.userId, 'rendering', 'failed', String(err))
  }
}

export async function handleRenderWebhook(videoId: string, body: FalWebhookPayload) {
  const video = await getLofiVideo(videoId)
  if (!video) return
  if (video.status === 'complete' || video.status === 'aborted') return

  if (body.status === 'ERROR' || body.error) {
    await updateLofiVideo(videoId, { status: 'failed' } as any)
    await db.update(stories)
      .set({ status: 'failed' })
      .where(eq(stories.id, video.storyId))

    const refund = Math.min(RENDER_CREDITS, video.creditsPreAuth)
    if (refund > 0) {
      await db.execute(
        sql`UPDATE "user" SET credits = credits + ${refund} WHERE id = ${video.userId}`,
      )
    }

    await publishVideoStatus(videoId, 'failed', { failStage: 'rendering' })
    await logStageTransition(videoId, video.userId, 'rendering', 'failed', 'render_error')
    return
  }

  const outputUrl = extractResultUrl(body)
  if (!outputUrl) {
    await updateLofiVideo(videoId, { status: 'failed' } as any)
    await publishVideoStatus(videoId, 'failed', { failStage: 'rendering' })
    await logStageTransition(videoId, video.userId, 'rendering', 'failed', 'no_output_url')
    return
  }

  try {
    const { data } = await downloadToBuffer(outputUrl)
    const blobUrl = await uploadComposedVideo(video.storyId, data)
    await finalizeLofiVideo(videoId, blobUrl, video.targetDurationSec)
  } catch (err) {
    console.error('lofi render blob upload failed', err)
    await updateLofiVideo(videoId, { status: 'failed' } as any)
    await db.update(stories)
      .set({ status: 'failed' })
      .where(eq(stories.id, video.storyId))
    await logStageTransition(
      videoId,
      video.userId,
      'rendering',
      'failed',
      err instanceof Error ? err.message : 'blob_upload_failed',
    )
    return
  }

  await settleCredits(videoId)
  await publishVideoStatus(videoId, 'complete', { finalVideoUrl: outputUrl })
  await logStageTransition(videoId, video.userId, 'rendering', 'complete')

  await logApiCost({
    userId: video.userId,
    storyId: video.storyId,
    provider: 'fal',
    model: 'ffmpeg-api/compose',
    operation: 'lofi_render',
    costUsd: RENDER_CREDITS * 0.01,
    creditsCharged: RENDER_CREDITS,
  })
}

export async function cancelVideo(videoId: string, userId: string) {
  const video = await db.query.lofiVideos.findFirst({
    where: and(eq(lofiVideos.id, videoId), eq(lofiVideos.userId, userId)),
  })
  if (!video || video.status === 'complete' || video.status === 'aborted') return

  const prevStatus = video.status

  await db.update(lofiVideos)
    .set({ status: 'aborted' })
    .where(and(
      eq(lofiVideos.id, videoId),
      eq(lofiVideos.userId, userId),
      sql`${lofiVideos.status} IN ('generating', 'rendering')`,
    ))

  const readySum = await db
    .select({ sum: sql<number>`coalesce(sum(${lofiAssets.creditsCharged}), 0)` })
    .from(lofiAssets)
    .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'ready')))

  const refund = video.creditsPreAuth - (readySum[0]?.sum ?? 0)
  if (refund > 0) {
    await db.execute(
      sql`UPDATE "user" SET credits = credits + ${refund} WHERE id = ${userId}`,
    )
  }

  await logStageTransition(videoId, userId, prevStatus, 'aborted', `refund=${refund}`)
}

export async function retryRender(videoId: string, userId: string) {
  const video = await db.query.lofiVideos.findFirst({
    where: and(eq(lofiVideos.id, videoId), eq(lofiVideos.userId, userId)),
  })
  if (!video) throw new Error('Video not found')
  if (video.status !== 'failed') throw new Error('Video must be in failed status to retry render')

  await updateLofiVideo(videoId, { status: 'rendering' } as any)
  await logStageTransition(videoId, userId, 'failed', 'rendering', 'retry_render')

  await runArrangementAndRender(videoId)
}

export interface RecomposeInput {
  selectedTracks?: FreetouseTrackRef[]
  musicModel: string
  musicLoopCount: number
  visualPrompts: string[]
  visualConfig: VisualConfig
  isStock: boolean
}

export async function recomposeVideo(
  videoId: string,
  userId: string,
  input: RecomposeInput,
) {
  const video = await db.query.lofiVideos.findFirst({
    where: and(eq(lofiVideos.id, videoId), eq(lofiVideos.userId, userId)),
  })
  if (!video) throw new Error('Video not found')

  const terminal = ['complete', 'failed', 'aborted']
  if (!terminal.includes(video.status)) {
    throw new Error('Video must be in terminal state to recompose')
  }

  await db.delete(lofiAssets).where(eq(lofiAssets.videoId, videoId))

  const fakeInput: GenerateInput = {
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

  const assetRows = buildAssetRows(videoId, fakeInput)
  await db.insert(lofiAssets).values(assetRows)

  await db.update(lofiVideos)
    .set({
      status: 'generating',
      arrangementJson: null,
      finalVideoUrl: null,
      finalDurationSec: null,
      musicLoopCount: input.selectedTracks?.length ?? input.musicLoopCount,
      updatedAt: new Date(),
    })
    .where(eq(lofiVideos.id, videoId))

  await db.update(stories)
    .set({ status: 'draft', updatedAt: new Date() })
    .where(eq(stories.id, video.storyId))

  await logStageTransition(videoId, userId, video.status, 'generating', 'recompose')

  const baseUrl = webhookBaseUrl()

  after(async () => {
    try {
      await submitAssets(videoId, video.storyId, assetRows, input.isStock, baseUrl)
    } catch (err) {
      console.error(`[lofi] recompose background failed for ${videoId}`, err)
    }
  })
}
