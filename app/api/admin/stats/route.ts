import { auth } from '@/lib/externals/betterauth'
import { getAdminStats } from '@/lib/db/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return Response.json(await getAdminStats())
}
