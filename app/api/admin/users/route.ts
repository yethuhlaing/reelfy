import { requireAdminSession, isAuthError } from '@/lib/db/user'
import { getAdminUsers } from '@/lib/db/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireAdminSession(request)
  if (isAuthError(session)) return session

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  return Response.json(await getAdminUsers(state ?? undefined))
}
