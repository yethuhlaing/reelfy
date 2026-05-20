import { auth } from '@/lib/externals/betterauth'
import { listUserStories } from '@/lib/db/stories'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const category = url.searchParams.get('category') ?? undefined
  const rows = await listUserStories(session.user.id, category)
  return Response.json({
    stories: rows.map((s) => ({
      id: s.id,
      title: s.title,
      tagline: s.tagline,
      category: s.category,
      status: s.status,
      thumbnailUrl: s.thumbnailUrl,
      sceneCount: s.sceneCount,
      savedAt: s.createdAt.getTime(),
      lastUpdated: s.updatedAt.getTime(),
    })),
  })
}
