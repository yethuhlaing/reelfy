import { del, list } from '@vercel/blob'
import { auth } from '@/lib/externals/betterauth'
import {
  deleteStoryForUser,
  getStoryForUser,
  parseOptions,
  rowToStoryData,
  updateStoryMeta,
} from '@/lib/db/stories'
import { deleteJobsForStory } from '@/lib/jobs/store'

export const runtime = 'nodejs'
export const maxDuration = 300

interface DeleteStoryBody {
  legacyUrls?: string[]
}

interface DeleteSummary {
  deleted: number
  failed: number
}

async function deletePrefix(prefix: string, summary: DeleteSummary): Promise<void> {
  const { blobs } = await list({ prefix })
  for (const blob of blobs) {
    try {
      await del(blob.url)
      summary.deleted += 1
    } catch {
      summary.failed += 1
    }
  }
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const result = await getStoryForUser(storyId, session.user.id)
  if (!result) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const { story, scenes: sceneRows } = result
  return Response.json({
    id: story.id,
    category: story.category,
    status: story.status,
    storyInput: story.storyInput,
    options: parseOptions(story.options),
    composedVideoUrl: story.composedVideoUrl,
    savedAt: story.createdAt.getTime(),
    lastUpdated: story.updatedAt.getTime(),
    storyData: rowToStoryData(story, sceneRows),
  })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: storyId } = await ctx.params
  const body = (await request.json().catch(() => ({}))) as {
    title?: string
    thumbnailUrl?: string | null
    composedVideoUrl?: string | null
    status?: string
  }
  const ok = await updateStoryMeta(storyId, session.user.id, body)
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ ok: true })
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as DeleteStoryBody
  const legacyUrls = Array.isArray(body.legacyUrls)
    ? body.legacyUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []

  const deleted = await deleteStoryForUser(storyId, session.user.id)
  if (!deleted) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const summary: DeleteSummary = { deleted: 0, failed: 0 }

  const prefixes = [
    `thumbnails/${storyId}`,
    `scenes/${storyId}/`,
    `voiceovers/${storyId}/`,
    `animations/${storyId}-`,
    `composed/${storyId}`,
  ]

  for (const prefix of prefixes) {
    try {
      await deletePrefix(prefix, summary)
    } catch {
      summary.failed += 1
    }
  }

  for (const url of legacyUrls) {
    try {
      await del(url)
      summary.deleted += 1
    } catch {
      summary.failed += 1
    }
  }

  await deleteJobsForStory(storyId)

  return Response.json({ ok: true, ...summary })
}
