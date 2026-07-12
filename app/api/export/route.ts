import { fal } from '@/shared/lib/providers/fal'
import { createJob, markRunning } from '@/shared/lib/jobs/store'
import { buildWebhookUrl } from '@/shared/lib/jobs/webhook-url'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getStoryForUser } from '@/features/stories/server/stories-db'
import type { ExportPayload, ExportSceneInput } from '@/shared/lib/jobs/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const EXPORT_MODEL_ID = 'fal-ai/ffmpeg-api/compose'


interface FalKeyframe { timestamp: number; duration: number; url: string }
interface FalTrack { id: string; type: 'audio' | 'video' | 'image'; keyframes: FalKeyframe[] }

function buildExportTracksPayload(scenes: ExportSceneInput[]): FalTrack[] {
  const videoKeyframes: FalKeyframe[] = []
  const audioKeyframes: FalKeyframe[] = []
  let cursorMs = 0

  for (const scene of scenes) {
    const durMs = Math.round(scene.duration * 1000)
    videoKeyframes.push({ timestamp: cursorMs, duration: durMs, url: scene.visualUrl })
    audioKeyframes.push({ timestamp: cursorMs, duration: durMs, url: scene.voiceoverUrl })
    cursorMs += durMs
  }

  const hasAnimated = scenes.some((s) => s.isAnimated)
  return [
    { id: 'video', type: hasAnimated ? 'video' : 'image', keyframes: videoKeyframes },
    { id: 'audio', type: 'audio', keyframes: audioKeyframes },
  ]
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function validateScenes(raw: unknown): ExportSceneInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ExportSceneInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null
    const r = item as Record<string, unknown>
    if (
      typeof r.sceneId !== 'string' ||
      typeof r.visualUrl !== 'string' ||
      typeof r.isAnimated !== 'boolean' ||
      typeof r.voiceoverUrl !== 'string' ||
      typeof r.duration !== 'number' ||
      r.duration <= 0
    ) return null
    out.push({
      sceneId: r.sceneId,
      visualUrl: r.visualUrl,
      isAnimated: r.isAnimated,
      voiceoverUrl: r.voiceoverUrl,
      duration: r.duration,
    })
  }
  return out
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, scenes: rawScenes, resolution } = body as {
    storyId?: string
    scenes?: unknown
    resolution?: string
  }

  if (!storyId) return badRequest('Missing storyId')
  if (resolution !== '720p' && resolution !== '1080p') return badRequest('Invalid resolution')

  const scenes = validateScenes(rawScenes)
  if (!scenes) return badRequest('Invalid scenes')

  const story = await getStoryForUser(storyId, userId)
  if (!story) return badRequest('Story not found')

  const tracks = buildExportTracksPayload(scenes)

  const payload: ExportPayload = { storyId, scenes, resolution, userId }
  const job = await createJob<ExportPayload>('export', payload)

  try {
    const submitted = await fal.queue.submit(EXPORT_MODEL_ID, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: { tracks } as any,
      webhookUrl: buildWebhookUrl('story/export', job.id),
    })
    await markRunning(job.id, submitted.request_id, EXPORT_MODEL_ID)
    return Response.json({ jobId: job.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Export enqueue failed', msg)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}
