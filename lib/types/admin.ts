export interface RevenueCostPoint {
  bucket: string
  revenueUsd: number
  costUsd: number
}

export interface ModelMarginItem {
  key: string
  provider: string
  model: string
  creditsCharged: number
  estimatedRevenueUsd: number
  costUsd: number
  marginUsd: number
  marginPct: number
}

export interface AdminUserSpendRow {
  userId: string
  email: string
  name: string | null
  revenueUsd: number
  apiCostUsd: number
  marginUsd: number
  marginPct: number
  totalCreditsCharged: number
  totalCreditsPurchased: number
  isUnprofitable: boolean
}

export interface AdminStatsResponse {
  totals: {
    revenueUsd: number
    costUsd: number
    marginUsd: number
    marginPct: number
    activeUsers: number
  }
  revenueVsCostDaily: RevenueCostPoint[]
  revenueVsCostWeekly: RevenueCostPoint[]
  marginByModel: ModelMarginItem[]
  userSpend: AdminUserSpendRow[]
  topExpensiveUsers: AdminUserSpendRow[]
  unprofitableUsers: AdminUserSpendRow[]
}

export interface AdminUsersResponse {
  users: AdminUserSpendRow[]
}
