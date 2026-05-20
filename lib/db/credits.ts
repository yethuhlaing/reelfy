import { and, eq, gte, sql } from 'drizzle-orm'
import { db } from './index'
import { user } from './schema'

export async function getCredits(userId: string): Promise<number> {
  const rows = await db
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0]?.credits ?? 0
}

export async function deductCredits(
  userId: string,
  amount: number,
): Promise<{ ok: boolean; balance: number }> {
  const rows = await db
    .update(user)
    .set({ credits: sql`${user.credits} - ${amount}` })
    .where(and(eq(user.id, userId), gte(user.credits, amount)))
    .returning({ balance: user.credits })

  if (rows.length === 0) {
    const balance = await getCredits(userId)
    return { ok: false, balance }
  }

  return { ok: true, balance: rows[0].balance }
}
