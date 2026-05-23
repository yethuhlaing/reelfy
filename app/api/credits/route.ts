import { requireUserSession, isAuthError } from '@/lib/db/user'
import { getCredits } from '@/lib/db/credits'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const balance = await getCredits(session.user.id)
  return Response.json({ balance })
}
