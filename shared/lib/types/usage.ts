export interface UsageStoryItem {
  storyId: string | null
  storyTitle: string
  creditsCharged: number
  costUsd: number
  modelCombo: string
  lastUsedAt: number
}

export interface PaymentHistoryItem {
  id: string
  packType: string
  creditsPurchased: number
  amountUsd: number
  createdAt: number
}

export interface ModelBreakdownItem {
  provider: string
  model: string
  creditsCharged: number
  costUsd: number
  calls: number
}

export interface UserUsageResponse {
  balance: number
  totalCreditsCharged: number
  totalCostUsd: number
  totalPurchasedUsd: number
  usageByStory: UsageStoryItem[]
  paymentHistory: PaymentHistoryItem[]
  modelBreakdown: ModelBreakdownItem[]
}
