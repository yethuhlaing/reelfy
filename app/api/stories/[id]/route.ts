import { del, list } from '@vercel/blob'
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

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: storyId } = await ctx.params
  if (!storyId) {
    return Response.json({ error: 'Missing story id' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as DeleteStoryBody
  const legacyUrls = Array.isArray(body.legacyUrls)
    ? body.legacyUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []

  const summary: DeleteSummary = { deleted: 0, failed: 0 }

  const cancelUrl = new URL(`/api/stories/${storyId}/cancel`, req.url)
  try {
    await fetch(cancelUrl, { method: 'POST' })
  } catch {
    // best-effort cancellation; continue cleanup
  }

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
