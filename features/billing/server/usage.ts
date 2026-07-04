import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { apiUsageEvents, user } from '@/shared/lib/db/schema'
import { polar } from './polar-client'

export type MeterName = 'api_calls' | 'image_gen' | 'video_gen' | 'voice_gen' | 'story_gen' | 'meme_generation'

export interface UsageEventInput {
  userId: string
  meter: MeterName
  route: string
  quantity?: number
  metadata?: Record<string, unknown>
}

async function getCustomerId(userId: string): Promise<string | null> {
  const rows = await db
    .select({ id: user.polarCustomerId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0]?.id ?? null
}

export async function ingestUsage(evt: UsageEventInput): Promise<void> {
  const id = randomUUID()
  const quantity = evt.quantity ?? 1
  const metadata = JSON.stringify(evt.metadata ?? {})

  await db.insert(apiUsageEvents).values({
    id,
    userId: evt.userId,
    meter: evt.meter,
    quantity,
    route: evt.route,
    metadata,
  })

  const customerId = await getCustomerId(evt.userId)
  if (!customerId) return

  try {
    await polar().events.ingest({
      events: [
        {
          name: evt.meter,
          externalCustomerId: evt.userId,
          metadata: {
            route: evt.route,
            quantity,
            ...(evt.metadata ?? {}),
          },
        },
      ],
    })
    await db
      .update(apiUsageEvents)
      .set({ polarEventId: id, ingestedAt: new Date() })
      .where(eq(apiUsageEvents.id, id))
  } catch (err) {
    console.error('[polar] usage ingest failed', err)
  }
}

export function fireAndForgetUsage(evt: UsageEventInput): void {
  ingestUsage(evt).catch((err) => console.error('[polar] usage ingest fatal', err))
}
