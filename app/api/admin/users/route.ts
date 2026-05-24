import { requireAdminSession, isAuthError } from '@/shared/lib/db/user'
import { getAdminUsers } from '@/features/admin/server/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireAdminSession(request)
  if (isAuthError(session)) return session

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  return Response.json(await getAdminUsers(state ?? undefined))
}
