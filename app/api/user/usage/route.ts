import { desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/externals/betterauth'
import { getCredits } from '@/lib/db/credits'
import { db } from '@/lib/db'
import { apiCostLogs, payments, stories } from '@/lib/db/schema'
import type {
  ModelBreakdownItem,
  PaymentHistoryItem,
  UsageStoryItem,
  UserUsageResponse,
} from '@/lib/types/usage'

export const runtime = 'nodejs'

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [balance, costRows, paymentRows] = await Promise.all([
    getCredits(userId),
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

  let totalCreditsCharged = 0
  let totalCostUsd = 0

  for (const row of costRows) {
    const credits = row.creditsCharged ?? 0
    const costUsd = toNumber(row.costUsd)
    const provider = row.provider
    const model = row.model
    const modelLabel = `${provider}:${model}`

    totalCreditsCharged += credits
    totalCostUsd += costUsd

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

  const totalPurchasedUsd = paymentHistory.reduce((sum, row) => sum + row.amountUsd, 0)

  const modelBreakdown = Array.from(modelMap.values())
    .map((row) => ({ ...row, costUsd: Number(row.costUsd.toFixed(4)) }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const response: UserUsageResponse = {
    balance,
    totalCreditsCharged,
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalPurchasedUsd: Number(totalPurchasedUsd.toFixed(2)),
    usageByStory,
    paymentHistory,
    modelBreakdown,
  }

  return Response.json(response)
}
