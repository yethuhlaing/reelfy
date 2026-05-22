import { auth } from '@/lib/externals/betterauth'
import { getUserUsageData } from '@/lib/db/usage'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  return Response.json(await getUserUsageData(userId))
}
