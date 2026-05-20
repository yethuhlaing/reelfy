import { auth } from '@/lib/externals/betterauth'
import { getCredits } from '@/lib/db/credits'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const balance = await getCredits(session.user.id)
  return Response.json({ balance })
}
