import { requireUserSession, isAuthError } from '@/lib/db/user'
import { getUserUsageData } from '@/lib/db/usage'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  return Response.json(await getUserUsageData(session.user.id))
}
