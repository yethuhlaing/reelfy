import { auth } from '@/lib/externals/betterauth'
import { db } from '@/lib/db'
import { apiCostLogs, payments, user } from '@/lib/db/schema'
import type { AdminUserSpendRow, AdminUsersResponse } from '@/lib/types/admin'

export const runtime = 'nodejs'

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits))
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
    }).from(payments),
    db.select({
      userId: apiCostLogs.userId,
      costUsd: apiCostLogs.costUsd,
      creditsCharged: apiCostLogs.creditsCharged,
    }).from(apiCostLogs),
  ])

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

  const usersTable: AdminUserSpendRow[] = Array.from(agg.entries())
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

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const filtered = state === 'unprofitable' ? usersTable.filter((u) => u.isUnprofitable) : usersTable

  const response: AdminUsersResponse = {
    users: filtered,
  }

  return Response.json(response)
}
