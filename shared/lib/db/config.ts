import { eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { withDbRetry } from '@/shared/lib/db/retry'
import { appConfig } from '@/shared/lib/db/schema'

export const FREE_CREDITS_ON_SIGNUP_KEY = 'free_credits_on_signup'
const BRAINROT_CHUNK_CURSOR_PREFIX = 'brainrot_chunk_cursor:'

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export async function getAppConfigValue(key: string, defaultValue?: string): Promise<string> {
  const rows = await withDbRetry(() =>
    db.select({ value: appConfig.value }).from(appConfig).where(eq(appConfig.key, key)).limit(1),
  )

  if (rows[0]?.value != null) {
    return rows[0].value
  }

  if (defaultValue === undefined) {
    return ''
  }

  await db.insert(appConfig).values({ key, value: defaultValue }).onConflictDoNothing()
  return defaultValue
}

export async function setAppConfigValue(key: string, value: string): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value },
    })
}

/**
 * Atomically claim the next chunk-window cursor for a background category and
 * advance it by one. Runs as a single upsert with a RETURNING clause so
 * concurrent exports never claim the same value (no read-modify-write race).
 * The returned cursor is fed to pickSequentialChunks so consecutive exports of
 * the same category walk through all background footage instead of repeating.
 */
export async function nextBrainrotChunkCursor(categoryId: string): Promise<number> {
  const key = `${BRAINROT_CHUNK_CURSOR_PREFIX}${categoryId}`
  const rows = await withDbRetry(() =>
    db
      .insert(appConfig)
      .values({ key, value: '1' })
      .onConflictDoUpdate({
        target: appConfig.key,
        // Cast text -> int, add one, cast back. Wraps around harmlessly via the
        // modulo in pickSequentialChunks, so no upper bound is needed here.
        set: { value: sql`(${appConfig.value}::bigint + 1)::text` },
      })
      .returning({ value: appConfig.value }),
  )
  // Cursor used for THIS export is (new value - 1): the first export gets 0.
  const next = Number.parseInt(rows[0]?.value ?? '1', 10)
  return Number.isFinite(next) ? next - 1 : 0
}

export async function getFreeCreditsOnSignup(): Promise<number> {
  // Default: enough for a new user to finish one video (cheapest export ~19cr).
  // One-time grant on signup — the free tier has no monthly refill.
  const value = await getAppConfigValue(FREE_CREDITS_ON_SIGNUP_KEY, '25')
  const parsed = Number.parseInt(value, 10)
  return toNonNegativeInt(parsed)
}

export async function setFreeCreditsOnSignup(credits: number): Promise<number> {
  const normalized = toNonNegativeInt(credits)
  await setAppConfigValue(FREE_CREDITS_ON_SIGNUP_KEY, String(normalized))
  return normalized
}
