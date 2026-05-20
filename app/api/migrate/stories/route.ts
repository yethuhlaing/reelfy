import { auth } from '@/lib/externals/betterauth'
import { db } from '@/lib/db'
import { stories, scenes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Scene, GenerateOptions, StoryData } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

interface LocalStoredStory {
  id: string
  storyInput: string
  options: GenerateOptions
  storyData: StoryData
  savedAt: number
  category: string
  composedVideoUrl?: string | null
  lastUpdated?: number
}

interface MigrateRequest {
  stories: LocalStoredStory[]
}

interface MigrateResult {
  migrated: number
  skipped: number
  failed: number
  errors: { id: string; error: string }[]
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await request.json().catch(() => null) as MigrateRequest | null
  if (!body?.stories || !Array.isArray(body.stories)) {
    return Response.json({ error: 'Invalid body: expected { stories: [...] }' }, { status: 400 })
  }

  const result: MigrateResult = { migrated: 0, skipped: 0, failed: 0, errors: [] }

  for (const ls of body.stories) {
    try {
      if (!ls.id || !ls.storyData) {
        result.skipped++
        continue
      }

      // Skip if already exists
      const existing = await db.select({ id: stories.id }).from(stories).where(eq(stories.id, ls.id)).limit(1)
      if (existing.length > 0) {
        result.skipped++
        continue
      }

      const sd = ls.storyData
      const savedAt = new Date(ls.savedAt)
      const updatedAt = new Date(ls.lastUpdated ?? ls.savedAt)

      await db.insert(stories).values({
        id: ls.id,
        userId,
        title: sd.title,
        tagline: sd.tagline,
        protagonist: sd.protagonist,
        thumbnailUrl: sd.thumbnailUrl ?? null,
        sceneCount: sd.scenes.length,
        createdAt: savedAt,
        updatedAt,
      })

      if (sd.scenes.length > 0) {
        await db.insert(scenes).values(
          sd.scenes.map((sc: Scene, idx: number) => ({
            id: crypto.randomUUID(),
            storyId: ls.id,
            orderIndex: idx,
            imageUrl: sc.imageUrl ?? null,
            voiceoverUrl: sc.voiceoverUrl ?? null,
            videoUrl: sc.videoUrl ?? null,
            sentence: sc.sentence,
            voiceoverText: sc.voiceover,
            action: sc.action,
            setting: sc.setting,
            emotion: sc.emotion,
            imageModel: ls.options?.imageModel ?? null,
            videoModel: ls.options?.videoModel ?? null,
            creditsCharged: 0,
            costUsd: '0',
            createdAt: savedAt,
          })),
        )
      }

      result.migrated++
    } catch (err) {
      result.failed++
      result.errors.push({ id: ls.id ?? '?', error: String(err) })
    }
  }

  return Response.json(result)
}
