import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { payments, subscriptions, user } from '@/shared/lib/db/schema'
import { planByProductId, type PlanTier } from './plans'

interface PolarOrder {
  id: string
  productId: string
  customerId: string
  amount?: number | null
  metadata?: Record<string, unknown> | null
}

interface PolarSubscription {
  id: string
  productId: string
  customerId: string
  status: string
  currentPeriodStart?: string | Date | null
  currentPeriodEnd?: string | Date | null
  cancelAtPeriodEnd?: boolean | null
  metadata?: Record<string, unknown> | null
}

function userIdFromMetadata(meta: Record<string, unknown> | null | undefined): string | null {
  const v = meta?.userId ?? meta?.user_id
  return typeof v === 'string' && v.length > 0 ? v : null
}

async function resolveUserId(customerId: string, meta: Record<string, unknown> | null | undefined) {
  const fromMeta = userIdFromMetadata(meta)
  if (fromMeta) return fromMeta
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.polarCustomerId, customerId))
    .limit(1)
  return rows[0]?.id ?? null
}

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

export async function handleOrderPaid(order: PolarOrder): Promise<void> {
  const plan = planByProductId(order.productId)
  if (!plan) return

  const userId = await resolveUserId(order.customerId, order.metadata)
  if (!userId) {
    console.warn('[polar] order paid but user not found', order.id)
    return
  }

  await db.update(user).set({ polarCustomerId: order.customerId }).where(eq(user.id, userId))

  if (plan.interval === 'one_time') {
    await db
      .insert(payments)
      .values({
        id: randomUUID(),
        userId,
        polarOrderId: order.id,
        creditsPurchased: plan.monthlyCredits,
        amountUsd: String(plan.priceUsd),
        packType: plan.slug,
      })
      .onConflictDoNothing({ target: payments.polarOrderId })

    await db
      .update(user)
      .set({ credits: sql`${user.credits} + ${plan.monthlyCredits}` })
      .where(eq(user.id, userId))
  }
}

export async function upsertSubscription(sub: PolarSubscription): Promise<void> {
  const plan = planByProductId(sub.productId)
  if (!plan) return

  const userId = await resolveUserId(sub.customerId, sub.metadata)
  if (!userId) {
    console.warn('[polar] subscription event but user not found', sub.id)
    return
  }

  const tier: PlanTier = plan.tier
  const isActive = sub.status === 'active' || sub.status === 'trialing'

  await db.update(user).set({ polarCustomerId: sub.customerId }).where(eq(user.id, userId))

  await db
    .insert(subscriptions)
    .values({
      id: randomUUID(),
      userId,
      polarSubscriptionId: sub.id,
      polarProductId: sub.productId,
      planTier: tier,
      status: sub.status,
      currentPeriodStart: toDate(sub.currentPeriodStart),
      currentPeriodEnd: toDate(sub.currentPeriodEnd),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    })
    .onConflictDoUpdate({
      target: subscriptions.polarSubscriptionId,
      set: {
        status: sub.status,
        planTier: tier,
        polarProductId: sub.productId,
        currentPeriodStart: toDate(sub.currentPeriodStart),
        currentPeriodEnd: toDate(sub.currentPeriodEnd),
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
        updatedAt: new Date(),
      },
    })

  await db
    .update(user)
    .set({ planTier: isActive ? tier : 'free' })
    .where(eq(user.id, userId))
}

export async function handleSubscriptionActive(sub: PolarSubscription): Promise<void> {
  const plan = planByProductId(sub.productId)
  if (!plan) return
  await upsertSubscription(sub)
  const userId = await resolveUserId(sub.customerId, sub.metadata)
  if (!userId) return
  if (plan.monthlyCredits > 0) {
    await db
      .update(user)
      .set({ credits: sql`${user.credits} + ${plan.monthlyCredits}` })
      .where(eq(user.id, userId))
  }
}

export async function handleSubscriptionEnded(sub: PolarSubscription): Promise<void> {
  await upsertSubscription({ ...sub, status: 'canceled' })
}
