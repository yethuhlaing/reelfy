import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { lofiAssets, lofiVideos, user } from '@/shared/lib/db/schema'
import { getAppConfigValue } from '@/shared/lib/db/config'
import { getLofiVideo } from './lofi-db'
import type { VisualConfig } from '@/shared/lib/types'
import { RENDER_CREDITS, MUSIC_PRICING, VISUAL_PRICING, MIN_MUSIC_LOOPS } from '../lib/pricing-constants'

export { RENDER_CREDITS, MIN_MUSIC_LOOPS }

export function getVisualPricing(model: string): { credits: number; costUsd: number } {
  return VISUAL_PRICING[model] ?? { credits: 1, costUsd: 0.003 }
}

export function calculateMusicCredits(musicModel: string, loopCount: number): number {
  const pricing = MUSIC_PRICING[musicModel]
  return (pricing?.creditsPerLoop ?? 5) * loopCount
}

export function calculateVisualCredits(visualConfig: VisualConfig): number {
  let total = 0
  for (const _asset of visualConfig.assets) {
    const pricing = getVisualPricing(visualConfig.model)
    total += pricing.credits
  }
  return total
}

export function calculateTotalCredits(
  musicModel: string,
  musicLoopCount: number,
  visualConfig: VisualConfig,
): number {
  return (
    calculateMusicCredits(musicModel, musicLoopCount) +
    calculateVisualCredits(visualConfig) +
    RENDER_CREDITS
  )
}

export function calculateAssetCostUsd(model: string): string {
  return String(getVisualPricing(model).costUsd)
}

export function calculateAssetCredits(model: string, kind: string): number {
  if (kind === 'music') {
    return MUSIC_PRICING[model]?.creditsPerLoop ?? 5
  }
  return getVisualPricing(model).credits
}

export async function settleCredits(videoId: string): Promise<void> {
  const video = await getLofiVideo(videoId)
  if (!video) return

  const assetSum = await db
    .select({ sum: sql<number>`coalesce(sum(${lofiAssets.creditsCharged}), 0)` })
    .from(lofiAssets)
    .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'ready')))

  const settled = (assetSum[0]?.sum ?? 0) + RENDER_CREDITS
  const refund = video.creditsPreAuth - settled

  if (refund > 0) {
    await refundCredits(video.userId, refund)
  }

  await db.update(lofiVideos)
    .set({ creditsSettled: settled })
    .where(eq(lofiVideos.id, videoId))
}

async function refundCredits(userId: string, amount: number): Promise<void> {
  await db.update(user)
    .set({ credits: sql`${user.credits} + ${amount}` })
    .where(eq(user.id, userId))
}

export async function getLofiMinSuccessRate(): Promise<number> {
  const raw = await getAppConfigValue('lofi_min_success_rate', '0.8')
  const val = Number.parseFloat(raw)
  return Number.isFinite(val) ? Math.max(0, Math.min(1, val)) : 0.8
}
