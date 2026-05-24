import { randomUUID } from 'node:crypto'
import { db } from './index'
import { apiCostLogs } from './schema'

export interface ApiCostContext {
  userId?: string | null
  storyId?: string | null
  sceneId?: string | null
  creditsCharged?: number
  operation?: string
}

export interface ApiCostLogInput {
  provider: string
  model: string
  operation: string
  costUsd: number
  userId?: string | null
  storyId?: string | null
  sceneId?: string | null
  creditsCharged?: number
}

function normalizeUsd(costUsd: number): string {
  const value = Number.isFinite(costUsd) ? Math.max(0, costUsd) : 0
  return value.toFixed(4)
}

async function insertApiCostLog(input: ApiCostLogInput): Promise<void> {
  if (!Number.isFinite(input.costUsd) || input.costUsd <= 0) return

  await db.insert(apiCostLogs).values({
    id: randomUUID(),
    userId: input.userId ?? null,
    storyId: input.storyId ?? null,
    sceneId: input.sceneId ?? null,
    provider: input.provider,
    model: input.model,
    operation: input.operation,
    costUsd: normalizeUsd(input.costUsd),
    creditsCharged: input.creditsCharged ?? 0,
  })
}

export async function logApiCost(input: ApiCostLogInput): Promise<void> {
  try {
    await insertApiCostLog(input)
  } catch (error) {
    console.error('Failed to log API cost', {
      provider: input.provider,
      model: input.model,
      operation: input.operation,
      error,
    })
  }
}
