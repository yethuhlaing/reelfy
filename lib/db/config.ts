import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appConfig } from '@/lib/db/schema'

export const FREE_CREDITS_ON_SIGNUP_KEY = 'free_credits_on_signup'

function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export async function getAppConfigValue(key: string, defaultValue?: string): Promise<string> {
  const rows = await db.select({ value: appConfig.value }).from(appConfig).where(eq(appConfig.key, key)).limit(1)

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

export async function getFreeCreditsOnSignup(): Promise<number> {
  const value = await getAppConfigValue(FREE_CREDITS_ON_SIGNUP_KEY, '0')
  const parsed = Number.parseInt(value, 10)
  return toNonNegativeInt(parsed)
}

export async function setFreeCreditsOnSignup(credits: number): Promise<number> {
  const normalized = toNonNegativeInt(credits)
  await setAppConfigValue(FREE_CREDITS_ON_SIGNUP_KEY, String(normalized))
  return normalized
}
