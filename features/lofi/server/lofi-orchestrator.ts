import { randomUUID } from 'node:crypto'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, stories } from '@/shared/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { deductCredits, getCredits } from '@/shared/lib/db/credits'
import { fal } from '@/shared/lib/providers/fal'
import { getImageProvider } from '@/shared/lib/providers/image'
import { getVideoProvider } from '@/shared/lib/providers/video'
import { getMusicProvider } from '@/shared/lib/providers/music'
import { logApiCost } from '@/shared/lib/db/cost-logger'
import {
  getLofiVideo,
  getLofiAssetsForVideo,
  getAssetFanInCounts,
  claimVideoForRendering,
  updateLofiVideo,
  updateLofiAsset,
} from './lofi-db'
import { buildArrangementPlan, buildFilterGraph, allPlanUrls, type BuildPlanInput } from './arrangement'
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

export const MAX_RETRIES = 3

export class InsufficientCreditsError extends Error {
  constructor(balance: number, required: number) {
    super(`Insufficient credits: have ${balance}, need ${required}`)
    this.name = 'InsufficientCreditsError'
  }
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
}

export async function preAuthCredits(userId: string, amount: number): Promise<void> {
  const balance = await getCredits(userId)
  if (balance < amount) {
    throw new InsufficientCreditsError(balance, amount)
  }
  const result = await deductCredits(userId, amount)
  if (!result.ok) {
    throw new InsufficientCreditsError(result.balance, amount)
  }
}

function buildAssetRows(videoId: string, input: GenerateInput) {
  const rows: {
    id: string
    videoId: string
    kind: 'music' | 'visual'
    orderIndex: number
    prompt: string
    model: string
    durationSec: number
    costUsd: string
  }[] = []

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

  for (let i = 0; i < input.visualPrompts.length; i++) {
    const durationSec = input.visualConfig.assets[i]?.durationSec ?? 5
    const model = input.visualConfig.model || 'flux-schnell-fal'
    rows.push({
      id: randomUUID(),
      videoId,
      kind: 'visual',
      orderIndex: input.musicPrompts.length + i,
      prompt: input.visualPrompts[i],
      model,
      durationSec,
      costUsd: calculateAssetCostUsd(model),
    })
  }

  return rows
}

async function submitVisual(asset: {
  id: string
  prompt: string
  model: string
  durationSec: number
}, baseUrl: string): Promise<{ jobId: string; estimatedCostUsd: number }> {
  const isImage = asset.model.includes('flux') || asset.model.includes('gemini') || asset.model.includes('sdxl')
  const webhookUrl = `${baseUrl}/api/webhooks/fal/lofi-asset/${asset.id}`

  if (isImage) {
    const provider = getImageProvider(asset.model)
    const result = await provider.generate(asset.prompt, {
      aspectRatio: '16:9',
      resolution: '1920x1080',
    })
    const blob = await fal.storage.upload(new File([result.data], 'image.png', { type: result.mimeType }))
    return { jobId: blob, estimatedCostUsd: provider.costEstimateUsd }
  }

  const provider = getVideoProvider(asset.model)
  const { requestId } = await provider.enqueue(
    '',
    asset.prompt,
    { width: 1920, height: 1080 },
    webhookUrl,
  )
  return { jobId: requestId, estimatedCostUsd: provider.costEstimateUsd }
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

export async function launchVideo(input: GenerateInput, userId: string) {
  const totalCredits = calculateTotalCredits(input.musicModel, input.musicLoopCount, input.visualConfig)
  await preAuthCredits(userId, totalCredits)

  const videoId = randomUUID()
  const storyId = randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(stories).values({
      id: storyId,
      userId,
      category: 'lofi',
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
      musicLoopCount: input.musicLoopCount,
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

  const baseUrl = process.env.PUBLIC_BASE_URL ?? process.env.WEBHOOK_BASE_URL ?? ''
  if (!baseUrl) {
    throw new Error('PUBLIC_BASE_URL or WEBHOOK_BASE_URL must be configured')
  }

  await Promise.all(assetRows.map(async (row) => {
    try {
      let result: { jobId: string; estimatedCostUsd: number }
      if (row.kind === 'music') {
        const provider = getMusicProvider(row.model)
        result = await provider.submit({
          prompt: row.prompt,
          durationSec: row.durationSec,
          webhookUrl: `${baseUrl}/api/webhooks/fal/lofi-asset/${row.id}`,
        })
      } else {
        result = await submitVisual(row, baseUrl)
      }
      await updateLofiAsset(row.id, {
        falJobId: result.jobId,
        status: 'submitted',
        costUsd: String(result.estimatedCostUsd),
      })
    } catch (err) {
      console.error(`Asset ${row.id} (${row.kind}) submit failed`, err)
      await updateLofiAsset(row.id, {
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }))

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

async function downloadToBlob(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const blob = await fal.storage.upload(new File([buf], 'asset', { type: res.headers.get('content-type') ?? 'application/octet-stream' }))
  return blob
}

async function retryBackoff(attempt: number): Promise<void> {
  const delays = [0, 5000, 15000]
  const delay = delays[attempt] ?? 30000
  if (delay > 0) {
    await new Promise(r => setTimeout(r, delay))
  }
}

export async function retryAsset(asset: {
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

  const baseUrl = process.env.PUBLIC_BASE_URL ?? process.env.WEBHOOK_BASE_URL ?? ''
  const webhookUrl = `${baseUrl}/api/webhooks/fal/lofi-asset/${asset.id}`

  try {
    let result: { jobId: string; estimatedCostUsd: number }
    if (asset.kind === 'music') {
      const provider = getMusicProvider(asset.model)
      result = await provider.submit({
        prompt: asset.prompt,
        durationSec: asset.durationSec,
        webhookUrl,
      })
    } else {
      result = await submitVisual(asset, baseUrl)
    }
    await updateLofiAsset(asset.id, {
      falJobId: result.jobId,
      status: 'submitted',
      costUsd: String(result.estimatedCostUsd),
    })
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
        const url = await downloadToBlob(sourceUrl)
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
  const visual = assets.filter(a => a.kind === 'visual')
  const musicReady = music.filter(a => a.status === 'ready')
  const visualReady = visual.filter(a => a.status === 'ready')

  if (visualReady.length < visual.length) {
    return { proceed: false, reason: 'visual_incomplete' }
  }
  if (musicReady.length / music.length < 0.8) {
    return { proceed: false, reason: 'music_below_threshold' }
  }
  if (musicReady.length < MIN_MUSIC_LOOPS) {
    return { proceed: false, reason: 'music_insufficient_count' }
  }

  return { proceed: true }
}

async function markFailedAssetsSkipped(videoId: string) {
  await db.update(lofiAssets)
    .set({ status: 'skipped' })
    .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'failed')))
}

export async function maybeAdvanceVideo(videoId: string) {
  const counts = await getAssetFanInCounts(videoId)
  if (!counts) return

  const { total, done } = counts
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
      .filter(a => a.kind === 'music' && a.status === 'ready' && a.resultUrl)
      .map(a => ({ url: a.resultUrl!, lengthSec: a.durationSec, orderIndex: a.orderIndex })),
    visualAssets: assets
      .filter(a => a.kind === 'visual' && a.status === 'ready' && a.resultUrl)
      .map(a => ({ url: a.resultUrl!, durationSec: a.durationSec, orderIndex: a.orderIndex })),
  }
}

export async function runArrangementAndRender(videoId: string) {
  const video = await getLofiVideo(videoId)
  if (!video) throw new Error(`Video ${videoId} not found`)

  const { musicLoops, visualAssets } = await loadReadyAssets(videoId)

  if (musicLoops.length === 0) {
    await failVideoAndRefund(videoId, video.userId, 0, 'no_ready_music')
    return
  }

  const planInput: BuildPlanInput = {
    targetDurationSec: video.targetDurationSec,
    videoId: video.id,
    musicLoops,
    visualAssets,
    visualMode: video.visualMode as VisualMode,
    ambientBedUrl: null,
  }

  const plan = buildArrangementPlan(planInput)
  const planJson = JSON.stringify(plan)

  await updateLofiVideo(videoId, { arrangementJson: planJson } as any)

  const filterComplex = buildFilterGraph(plan)
  const inputs = allPlanUrls(plan).map(url => ({ url }))

  const baseUrl = process.env.PUBLIC_BASE_URL ?? process.env.WEBHOOK_BASE_URL ?? ''

  try {
    await fal.queue.submit('fal-ai/ffmpeg-api/compose', {
      input: {
        inputs,
        filter_complex: filterComplex,
      } as any,
      webhookUrl: `${baseUrl}/api/webhooks/fal/lofi-render/${videoId}`,
    })
  } catch (err) {
    console.error('Render submit failed', err)
    await updateLofiVideo(videoId, { status: 'failed' } as any)
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

    await logStageTransition(videoId, video.userId, 'rendering', 'failed', 'render_error')
    return
  }

  const outputUrl = extractResultUrl(body)
  if (!outputUrl) {
    await updateLofiVideo(videoId, { status: 'failed' } as any)
    await logStageTransition(videoId, video.userId, 'rendering', 'failed', 'no_output_url')
    return
  }

  await db.transaction(async (tx) => {
    await tx.update(lofiVideos)
      .set({
        status: 'complete',
        finalVideoUrl: outputUrl,
        finalDurationSec: video.targetDurationSec,
      })
      .where(eq(lofiVideos.id, videoId))
    await tx.update(stories)
      .set({ composedVideoUrl: outputUrl, status: 'ready' })
      .where(eq(stories.id, video.storyId))
  })

  await settleCredits(videoId)
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
