import { put } from '@vercel/blob'
import { composeStory, type ComposeScene } from '@/lib/compose'

export const runtime = 'nodejs'
export const maxDuration = 300

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, scenes } = body as { storyId?: string; scenes?: ComposeScene[] }

  if (!storyId || !scenes?.length) {
    return badRequest('Missing required fields: storyId, scenes')
  }

  try {
    const videoBuffer = await composeStory(scenes)

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`composed/${storyId}.mp4`, videoBuffer, {
        access: 'public',
        contentType: 'video/mp4',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      return Response.json({ videoUrl: blob.url })
    }

    // Local dev fallback: stream binary directly
    return new Response(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="story-${storyId}.mp4"`,
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Composition failed' }),
      { status: 500 }
    )
  }
}
