import { fal } from '@/shared/lib/providers/fal'
import { createJob, markRunning } from '@/shared/lib/jobs/store'
import { buildWebhookUrl } from '@/shared/lib/jobs/webhook-url'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser } from '@/features/stories/server/stories-db'
import type { ComposePayload, ComposeTrackInput } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const COMPOSE_MODEL_ID = 'fal-ai/ffmpeg-api/compose'

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function validateTracks(tracks: unknown): ComposeTrackInput[] | null {
  if (!Array.isArray(tracks) || tracks.length === 0) return null
  const out: ComposeTrackInput[] = []
  for (const t of tracks) {
    if (!t || typeof t !== 'object') return null
    const r = t as Record<string, unknown>
    if (
      typeof r.sceneId !== 'string' ||
      typeof r.videoUrl !== 'string' ||
      typeof r.voiceoverUrl !== 'string' ||
      typeof r.duration !== 'number' ||
      r.duration <= 0
    ) return null
    out.push({
      sceneId: r.sceneId,
      videoUrl: r.videoUrl,
      voiceoverUrl: r.voiceoverUrl,
      duration: r.duration,
    })
  }
  return out
}

function buildComposeInput(tracks: ComposeTrackInput[]) {
  const videoKeyframes: { timestamp: number; url: string; duration: number }[] = []
  const audioKeyframes: { timestamp: number; url: string; duration: number }[] = []
  let cursor = 0
  for (const t of tracks) {
    videoKeyframes.push({ timestamp: cursor, url: t.videoUrl, duration: t.duration })
    audioKeyframes.push({ timestamp: cursor, url: t.voiceoverUrl, duration: t.duration })
    cursor += t.duration
  }
  return {
    tracks: [
      { id: 'video', type: 'video', keyframes: videoKeyframes },
      { id: 'audio', type: 'audio', keyframes: audioKeyframes },
    ],
  }
}

async function rehostVoiceoversToFal(tracks: ComposeTrackInput[]): Promise<ComposeTrackInput[]> {
  return Promise.all(tracks.map(async (t) => {
    const res = await fetch(t.voiceoverUrl, { cache: 'no-store' })
    if (!res.ok) {
      throw new Error(`Scene ${t.sceneId}: voiceover not downloadable (HTTP ${res.status})`)
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 256) {
      throw new Error(`Scene ${t.sceneId}: voiceover empty or truncated`)
    }
    const file = new File([buf], `${t.sceneId}.mp3`, { type: 'audio/mpeg' })
    const url = await fal.storage.upload(file)
    return { ...t, voiceoverUrl: url }
  }))
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, tracks } = body as { storyId?: string; tracks?: unknown }
  if (!storyId) return badRequest('Missing storyId')
  const validated = validateTracks(tracks)
  if (!validated) return badRequest('Invalid tracks')

  const story = await getStoryForUser(storyId, userId)
  if (!story) return badRequest('Story not found')

  let rehosted: ComposeTrackInput[]
  try {
    rehosted = await rehostVoiceoversToFal(validated)
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : 'Failed to rehost voiceovers')
  }

  const payload: ComposePayload = { storyId, tracks: rehosted, userId }
  const job = await createJob<ComposePayload>('compose', payload)

  try {
    const submitted = await fal.queue.submit(COMPOSE_MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: buildComposeInput(rehosted) as any,
      webhookUrl: buildWebhookUrl('story/compose', job.id),
    })
    await markRunning(job.id, submitted.request_id, COMPOSE_MODEL_ID)
    return Response.json({ jobId: job.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Compose enqueue failed', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
