/**
 * Production `Credits` port. Wraps the existing deduct/refund helper so Video
 * processing does not invent a second ledger. `reserve` deducts immediately;
 * `consume` is bookkeeping (the hold is already gone); `release` refunds
 * whatever was reserved and never consumed.
 */

import { deductCredits } from '@/shared/lib/db/credits'
import { InsufficientCreditsError } from './errors'
import type { Credits } from './types'

export function createCredits(): Credits {
  return {
    async reserve(params: { userId: string; runId: string; amount: number }): Promise<void> {
      if (params.amount <= 0) return
      const result = await deductCredits(params.userId, params.amount)
      if (!result.ok) {
        throw new InsufficientCreditsError(result.balance, params.amount)
      }
    },

    async consume(_params: {
      userId: string
      runId: string
      stepId: string
      amount: number
    }): Promise<void> {
      // Already deducted at reserve. The kernel still calls consume so a path
      // that itemizes later can swap this adapter without changing lifecycle.
    },

    async release(params: { userId: string; runId: string; amount: number }): Promise<void> {
      if (params.amount <= 0) return
      await deductCredits(params.userId, -params.amount)
    },
  }
}
