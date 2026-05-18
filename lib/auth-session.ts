export interface SessionUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  credits?: number | null
}

type MaybeSessionShape = {
  user?: SessionUser
  session?: {
    user?: SessionUser
  }
}

export function getSessionUser(data: unknown): SessionUser | null {
  if (!data || typeof data !== 'object') return null

  const sessionData = data as MaybeSessionShape
  return sessionData.user ?? sessionData.session?.user ?? null
}

export function getUserCredits(user: SessionUser | null): number {
  if (!user) return 0
  const credits = user.credits
  return typeof credits === 'number' && Number.isFinite(credits) ? credits : 0
}
