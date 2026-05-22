import { auth } from '@/lib/externals/betterauth'
import { db } from '@/lib/db'
import { apiCostLogs, payments, user } from '@/lib/db/schema'
import type {
  AdminStatsResponse,
  AdminUserSpendRow,
  ModelMarginItem,
  RevenueCostPoint,
} from '@/lib/types/admin'

export const runtime = 'nodejs'

const CREDIT_VALUE_USD = 0.05

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits))
}

function toDayBucket(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toWeekBucket(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() - day + 1)
  return utc.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, paymentRows, costRows] = await Promise.all([
    db.select({ id: user.id, email: user.email, name: user.name }).from(user),
    db.select({
      userId: payments.userId,
      amountUsd: payments.amountUsd,
      creditsPurchased: payments.creditsPurchased,
      createdAt: payments.createdAt,
    }).from(payments),
    db.select({
      userId: apiCostLogs.userId,
      provider: apiCostLogs.provider,
      model: apiCostLogs.model,
      costUsd: apiCostLogs.costUsd,
      creditsCharged: apiCostLogs.creditsCharged,
      createdAt: apiCostLogs.createdAt,
    }).from(apiCostLogs),
  ])

  const userMeta = new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]))
  const userAgg = new Map<string, {
    revenueUsd: number
    apiCostUsd: number
    totalCreditsCharged: number
    totalCreditsPurchased: number
  }>()
  const daily = new Map<string, RevenueCostPoint>()
  const weekly = new Map<string, RevenueCostPoint>()
  const modelAgg = new Map<string, ModelMarginItem>()

  const ensureUser = (userId: string) => {
    if (!userAgg.has(userId)) {
      userAgg.set(userId, {
        revenueUsd: 0,
        apiCostUsd: 0,
        totalCreditsCharged: 0,
        totalCreditsPurchased: 0,
      })
    }
    return userAgg.get(userId)!
  }

  const ensureBucket = (map: Map<string, RevenueCostPoint>, bucket: string) => {
    if (!map.has(bucket)) {
      map.set(bucket, { bucket, revenueUsd: 0, costUsd: 0 })
    }
    return map.get(bucket)!
  }

  for (const row of paymentRows) {
    const revenue = toNumber(row.amountUsd)
    const userBucket = ensureUser(row.userId)
    userBucket.revenueUsd += revenue
    userBucket.totalCreditsPurchased += row.creditsPurchased

    const dayKey = toDayBucket(row.createdAt)
    const weekKey = toWeekBucket(row.createdAt)
    ensureBucket(daily, dayKey).revenueUsd += revenue
    ensureBucket(weekly, weekKey).revenueUsd += revenue
  }

  for (const row of costRows) {
    const costUsd = toNumber(row.costUsd)
    const charged = row.creditsCharged ?? 0
    const userId = row.userId ?? 'unknown'

    const userBucket = ensureUser(userId)
    userBucket.apiCostUsd += costUsd
    userBucket.totalCreditsCharged += charged

    const dayKey = toDayBucket(row.createdAt)
    const weekKey = toWeekBucket(row.createdAt)
    ensureBucket(daily, dayKey).costUsd += costUsd
    ensureBucket(weekly, weekKey).costUsd += costUsd

    const key = `${row.provider}:${row.model}`
    const modelBucket = modelAgg.get(key) ?? {
      key,
      provider: row.provider,
      model: row.model,
      creditsCharged: 0,
      estimatedRevenueUsd: 0,
      costUsd: 0,
      marginUsd: 0,
      marginPct: 0,
    }
    modelBucket.creditsCharged += charged
    modelBucket.estimatedRevenueUsd += charged * CREDIT_VALUE_USD
    modelBucket.costUsd += costUsd
    modelAgg.set(key, modelBucket)
  }

  const userSpend: AdminUserSpendRow[] = Array.from(userAgg.entries())
    .map(([userId, agg]) => {
      const meta = userMeta.get(userId)
      const marginUsd = agg.revenueUsd - agg.apiCostUsd
      const marginPct = agg.revenueUsd > 0 ? (marginUsd / agg.revenueUsd) * 100 : 0
      return {
        userId,
        email: meta?.email ?? 'unknown@deleted-user',
        name: meta?.name ?? null,
        revenueUsd: round(agg.revenueUsd, 2),
        apiCostUsd: round(agg.apiCostUsd, 4),
        marginUsd: round(marginUsd, 4),
        marginPct: round(marginPct, 2),
        totalCreditsCharged: agg.totalCreditsCharged,
        totalCreditsPurchased: agg.totalCreditsPurchased,
        isUnprofitable: agg.apiCostUsd > agg.revenueUsd,
      }
    })
    .sort((a, b) => b.apiCostUsd - a.apiCostUsd)

  const marginByModel = Array.from(modelAgg.values())
    .map((row) => {
      const marginUsd = row.estimatedRevenueUsd - row.costUsd
      const marginPct = row.estimatedRevenueUsd > 0 ? (marginUsd / row.estimatedRevenueUsd) * 100 : 0
      return {
        ...row,
        estimatedRevenueUsd: round(row.estimatedRevenueUsd, 4),
        costUsd: round(row.costUsd, 4),
        marginUsd: round(marginUsd, 4),
        marginPct: round(marginPct, 2),
      }
    })
    .sort((a, b) => b.costUsd - a.costUsd)

  const revenueUsd = userSpend.reduce((sum, row) => sum + row.revenueUsd, 0)
  const costUsd = userSpend.reduce((sum, row) => sum + row.apiCostUsd, 0)
  const marginUsd = revenueUsd - costUsd

  const activeUsers = new Set(
    userSpend.filter((row) => row.revenueUsd > 0 || row.apiCostUsd > 0).map((row) => row.userId),
  ).size

  const response: AdminStatsResponse = {
    totals: {
      revenueUsd: round(revenueUsd, 2),
      costUsd: round(costUsd, 4),
      marginUsd: round(marginUsd, 4),
      marginPct: revenueUsd > 0 ? round((marginUsd / revenueUsd) * 100, 2) : 0,
      activeUsers,
    },
    revenueVsCostDaily: Array.from(daily.values())
      .map((p) => ({ ...p, revenueUsd: round(p.revenueUsd, 2), costUsd: round(p.costUsd, 4) }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket)),
    revenueVsCostWeekly: Array.from(weekly.values())
      .map((p) => ({ ...p, revenueUsd: round(p.revenueUsd, 2), costUsd: round(p.costUsd, 4) }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket)),
    marginByModel,
    userSpend,
    topExpensiveUsers: [...userSpend].sort((a, b) => b.apiCostUsd - a.apiCostUsd).slice(0, 10),
    unprofitableUsers: userSpend.filter((u) => u.isUnprofitable),
  }

  return Response.json(response)
}
