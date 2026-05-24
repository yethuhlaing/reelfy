import { requireAdminSession, isAuthError } from '@/shared/lib/db/user'
import { getAdminStats } from '@/features/admin/server/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireAdminSession(request)
  if (isAuthError(session)) return session
  return Response.json(await getAdminStats())
}
