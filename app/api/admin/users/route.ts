import { auth } from '@/lib/externals/betterauth'
import { getAdminUsers } from '@/lib/db/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  return Response.json(await getAdminUsers(state ?? undefined))
}
