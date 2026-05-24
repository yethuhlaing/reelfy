import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getUserUsageData } from '@/shared/lib/db/usage'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  return Response.json(await getUserUsageData(session.user.id))
}
