import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits } from '@/shared/lib/db/credits'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const balance = await getCredits(session.user.id)
  return Response.json({ balance })
}
