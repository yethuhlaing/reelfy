import { desc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { getCredits } from '@/shared/lib/db/credits'
import { apiCostLogs, payments, stories } from '@/shared/lib/db/schema'
import type {
  ModelBreakdownItem,
  PaymentHistoryItem,
  UsageStoryItem,
  UserUsageResponse,
} from '@/shared/lib/types/usage'

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

export interface UserUsageTotals {
  balance: number
  totalCreditsCharged: number
  totalCostUsd: number
  totalPurchasedUsd: number
}

export async function getUserUsageTotals(userId: string): Promise<UserUsageTotals> {
  const [balance, costRows, paymentRows] = await Promise.all([
    getCredits(userId),
    db
      .select({
        creditsCharged: apiCostLogs.creditsCharged,
        costUsd: apiCostLogs.costUsd,
      })
      .from(apiCostLogs)
      .where(eq(apiCostLogs.userId, userId)),
    db
      .select({
        amountUsd: payments.amountUsd,
      })
      .from(payments)
      .where(eq(payments.userId, userId)),
  ])

  const totalCreditsCharged = costRows.reduce((sum, row) => sum + (row.creditsCharged ?? 0), 0)
  const totalCostUsd = costRows.reduce((sum, row) => sum + toNumber(row.costUsd), 0)
  const totalPurchasedUsd = paymentRows.reduce((sum, row) => sum + toNumber(row.amountUsd), 0)

  return {
    balance,
    totalCreditsCharged,
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalPurchasedUsd: Number(totalPurchasedUsd.toFixed(2)),
  }
}

export async function getUserUsageData(userId: string): Promise<UserUsageResponse> {
  const [totals, costRows, paymentRows] = await Promise.all([
    getUserUsageTotals(userId),
    db
      .select({
        storyId: apiCostLogs.storyId,
        storyTitle: stories.title,
        provider: apiCostLogs.provider,
        model: apiCostLogs.model,
        creditsCharged: apiCostLogs.creditsCharged,
        costUsd: apiCostLogs.costUsd,
        createdAt: apiCostLogs.createdAt,
      })
      .from(apiCostLogs)
      .leftJoin(stories, eq(apiCostLogs.storyId, stories.id))
      .where(eq(apiCostLogs.userId, userId))
      .orderBy(desc(apiCostLogs.createdAt)),
    db
      .select({
        id: payments.id,
        packType: payments.packType,
        creditsPurchased: payments.creditsPurchased,
        amountUsd: payments.amountUsd,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt)),
  ])

  const storyMap = new Map<
    string,
    {
      storyId: string | null
      storyTitle: string
      creditsCharged: number
      costUsd: number
      models: Set<string>
      lastUsedAt: number
    }
  >()
  const modelMap = new Map<string, ModelBreakdownItem>()

  for (const row of costRows) {
    const credits = row.creditsCharged ?? 0
    const costUsd = toNumber(row.costUsd)
    const provider = row.provider
    const model = row.model
    const modelLabel = `${provider}:${model}`

    const storyKey = row.storyId ?? 'general'
    const storyTitle = row.storyTitle ?? 'General usage'
    const timestamp = row.createdAt?.getTime() ?? 0
    const storyBucket = storyMap.get(storyKey) ?? {
      storyId: row.storyId,
      storyTitle,
      creditsCharged: 0,
      costUsd: 0,
      models: new Set<string>(),
      lastUsedAt: timestamp,
    }

    storyBucket.creditsCharged += credits
    storyBucket.costUsd += costUsd
    storyBucket.models.add(modelLabel)
    storyBucket.lastUsedAt = Math.max(storyBucket.lastUsedAt, timestamp)
    storyMap.set(storyKey, storyBucket)

    const modelKey = `${provider}::${model}`
    const modelBucket = modelMap.get(modelKey) ?? {
      provider,
      model,
      creditsCharged: 0,
      costUsd: 0,
      calls: 0,
    }
    modelBucket.creditsCharged += credits
    modelBucket.costUsd += costUsd
    modelBucket.calls += 1
    modelMap.set(modelKey, modelBucket)
  }

  const usageByStory: UsageStoryItem[] = Array.from(storyMap.values())
    .map((item) => ({
      storyId: item.storyId,
      storyTitle: item.storyTitle,
      creditsCharged: item.creditsCharged,
      costUsd: Number(item.costUsd.toFixed(4)),
      modelCombo: Array.from(item.models).sort().join(' + '),
      lastUsedAt: item.lastUsedAt,
    }))
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)

  const paymentHistory: PaymentHistoryItem[] = paymentRows.map((row) => ({
    id: row.id,
    packType: row.packType,
    creditsPurchased: row.creditsPurchased,
    amountUsd: toNumber(row.amountUsd),
    createdAt: row.createdAt.getTime(),
  }))

  const modelBreakdown = Array.from(modelMap.values())
    .map((row) => ({ ...row, costUsd: Number(row.costUsd.toFixed(4)) }))
    .sort((a, b) => b.costUsd - a.costUsd)

  return {
    ...totals,
    usageByStory,
    paymentHistory,
    modelBreakdown,
  }
}
