import { db } from '@/shared/lib/db'
import { apiCostLogs, payments, user } from '@/shared/lib/db/schema'
import type {
  AdminStatsResponse,
  AdminUserSpendRow,
  AdminUsersResponse,
  ModelMarginItem,
  RevenueCostPoint,
} from '@/features/admin/types/admin'
import { withDbRetry } from '@/shared/lib/db/retry'

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

function computeUserSpendRows(
  users: { id: string; email: string; name: string | null }[],
  paymentRows: { userId: string; amountUsd: string; creditsPurchased: number }[],
  costRows: { userId: string | null; costUsd: string; creditsCharged: number }[],
): AdminUserSpendRow[] {
  const userMeta = new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]))
  const agg = new Map<
    string,
    {
      revenueUsd: number
      apiCostUsd: number
      totalCreditsCharged: number
      totalCreditsPurchased: number
    }
  >()

  const ensure = (userId: string) => {
    if (!agg.has(userId)) {
      agg.set(userId, {
        revenueUsd: 0,
        apiCostUsd: 0,
        totalCreditsCharged: 0,
        totalCreditsPurchased: 0,
      })
    }
    return agg.get(userId)!
  }

  for (const row of paymentRows) {
    const item = ensure(row.userId)
    item.revenueUsd += toNumber(row.amountUsd)
    item.totalCreditsPurchased += row.creditsPurchased
  }

  for (const row of costRows) {
    const userId = row.userId ?? 'unknown'
    const item = ensure(userId)
    item.apiCostUsd += toNumber(row.costUsd)
    item.totalCreditsCharged += row.creditsCharged ?? 0
  }

  return Array.from(agg.entries())
    .map(([userId, values]) => {
      const meta = userMeta.get(userId)
      const marginUsd = values.revenueUsd - values.apiCostUsd
      const marginPct = values.revenueUsd > 0 ? (marginUsd / values.revenueUsd) * 100 : 0
      return {
        userId,
        email: meta?.email ?? 'unknown@deleted-user',
        name: meta?.name ?? null,
        revenueUsd: round(values.revenueUsd, 2),
        apiCostUsd: round(values.apiCostUsd, 4),
        marginUsd: round(marginUsd, 4),
        marginPct: round(marginPct, 2),
        totalCreditsCharged: values.totalCreditsCharged,
        totalCreditsPurchased: values.totalCreditsPurchased,
        isUnprofitable: values.apiCostUsd > values.revenueUsd,
      }
    })
    .sort((a, b) => b.apiCostUsd - a.apiCostUsd)
}

export async function getAdminUsers(state?: string): Promise<AdminUsersResponse> {
  const [users, paymentRows, costRows] = await withDbRetry(() =>
    Promise.all([
      db.select({ id: user.id, email: user.email, name: user.name }).from(user),
      db.select({
        userId: payments.userId,
        amountUsd: payments.amountUsd,
        creditsPurchased: payments.creditsPurchased,
      }).from(payments),
      db.select({
        userId: apiCostLogs.userId,
        costUsd: apiCostLogs.costUsd,
        creditsCharged: apiCostLogs.creditsCharged,
      }).from(apiCostLogs),
    ]),
  )

  const usersTable = computeUserSpendRows(users, paymentRows, costRows)
  return {
    users: state === 'unprofitable' ? usersTable.filter((u) => u.isUnprofitable) : usersTable,
  }
}

export async function getAdminStats(): Promise<AdminStatsResponse> {
  const [users, paymentRows, costRows] = await withDbRetry(() =>
    Promise.all([
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
    ]),
  )

  const userAgg = computeUserSpendRows(
    users,
    paymentRows.map((p) => ({ userId: p.userId, amountUsd: p.amountUsd, creditsPurchased: p.creditsPurchased })),
    costRows.map((c) => ({ userId: c.userId, costUsd: c.costUsd, creditsCharged: c.creditsCharged })),
  )

  const daily = new Map<string, RevenueCostPoint>()
  const weekly = new Map<string, RevenueCostPoint>()
  const modelAgg = new Map<string, ModelMarginItem>()

  const ensureBucket = (map: Map<string, RevenueCostPoint>, bucket: string) => {
    if (!map.has(bucket)) {
      map.set(bucket, { bucket, revenueUsd: 0, costUsd: 0 })
    }
    return map.get(bucket)!
  }

  for (const row of paymentRows) {
    const revenue = toNumber(row.amountUsd)
    const dayKey = toDayBucket(row.createdAt)
    const weekKey = toWeekBucket(row.createdAt)
    ensureBucket(daily, dayKey).revenueUsd += revenue
    ensureBucket(weekly, weekKey).revenueUsd += revenue
  }

  for (const row of costRows) {
    const costUsd = toNumber(row.costUsd)
    const charged = row.creditsCharged ?? 0
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

  const revenueUsd = userAgg.reduce((sum, row) => sum + row.revenueUsd, 0)
  const costUsd = userAgg.reduce((sum, row) => sum + row.apiCostUsd, 0)
  const marginUsd = revenueUsd - costUsd
  const activeUsers = new Set(
    userAgg.filter((row) => row.revenueUsd > 0 || row.apiCostUsd > 0).map((row) => row.userId),
  ).size

  return {
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
    userSpend: userAgg,
    topExpensiveUsers: [...userAgg].sort((a, b) => b.apiCostUsd - a.apiCostUsd).slice(0, 10),
    unprofitableUsers: userAgg.filter((u) => u.isUnprofitable),
  }
}
