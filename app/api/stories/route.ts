import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { listUserStories } from '@/features/stories/server/stories-db'
import type { DashboardStory } from '@/shared/lib/types/dashboard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const url = new URL(request.url)
  const category = url.searchParams.get('category') ?? undefined
  const rows = await listUserStories(session.user.id, category)
  const stories: DashboardStory[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    tagline: s.tagline,
    category: s.category,
    status: s.status as DashboardStory['status'],
    thumbnailUrl: s.thumbnailUrl,
    sceneCount: s.sceneCount,
    animatedCount: s.animatedCount,
    totalVoiceoverSeconds: s.totalVoiceoverSeconds,
    savedAt: s.createdAt.getTime(),
    lastUpdated: s.updatedAt.getTime(),
  }))
  return Response.json({
    stories,
  })
}
