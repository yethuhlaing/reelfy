import { requireAdminSession, isAuthError } from '@/lib/db/user'
import { getAdminStats } from '@/lib/db/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireAdminSession(request)
  if (isAuthError(session)) return session
  return Response.json(await getAdminStats())
}
