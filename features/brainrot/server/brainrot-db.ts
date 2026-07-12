import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { brainrotProjects } from '@/shared/lib/db/schema'
import type { WordTiming } from '@/shared/lib/types'
import type {
  BrainrotCaptionPosition,
  BrainrotFormat,
  BrainrotProject,
  BrainrotStatus,
} from '@/shared/lib/types/brainrot'

function rowToProject(r: typeof brainrotProjects.$inferSelect): BrainrotProject {
  return {
    id: r.id,
    inputText: r.inputText,
    title: r.title,
    script: r.script,
    format: r.format as BrainrotFormat,
    backgroundCategory: r.backgroundCategory,
    characterVoiceId: r.characterVoiceId,
    captionPosition: r.captionPosition as BrainrotCaptionPosition,
    voiceoverUrl: r.voiceoverUrl,
    voiceoverDurationSec: r.voiceoverDurationSec ? Number(r.voiceoverDurationSec) : null,
    voiceoverWordTimings: Array.isArray(r.voiceoverWordTimings)
      ? (r.voiceoverWordTimings as WordTiming[])
      : null,
    backgroundVideoId: r.backgroundVideoId,
    chunkStartIndex: r.chunkStartIndex,
    chunkUrls: Array.isArray(r.chunkUrls) ? (r.chunkUrls as string[]) : null,
    outputVideoUrl: r.outputVideoUrl,
    status: r.status as BrainrotStatus,
    renderJobId: r.renderJobId,
    creditsCharged: r.creditsCharged,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export async function insertBrainrotProject(input: {
  id: string
  userId: string
  inputText?: string
  title?: string
  script?: string
  format: BrainrotFormat
  backgroundCategory?: string
  characterVoiceId?: string
  captionPosition?: BrainrotCaptionPosition
  status?: BrainrotStatus
}): Promise<void> {
  await db.insert(brainrotProjects).values({
    id: input.id,
    userId: input.userId,
    inputText: input.inputText ?? '',
    title: input.title ?? '',
    script: input.script ?? '',
    format: input.format,
    backgroundCategory: input.backgroundCategory ?? '',
    characterVoiceId: input.characterVoiceId ?? '',
    captionPosition: input.captionPosition ?? 'bottom',
    status: input.status ?? 'draft',
  })
}

export async function updateBrainrotProject(
  projectId: string,
  userId: string,
  patch: Partial<{
    inputText: string
    title: string
    script: string
    format: BrainrotFormat
    backgroundCategory: string
    characterVoiceId: string
    captionPosition: BrainrotCaptionPosition
    voiceoverUrl: string | null
    voiceoverDurationSec: number | null
    voiceoverWordTimings: WordTiming[] | null
    backgroundVideoId: string | null
    chunkStartIndex: number | null
    chunkUrls: string[] | null
    outputVideoUrl: string | null
    status: BrainrotStatus
    renderJobId: string | null
    creditsCharged: number
  }>,
): Promise<BrainrotProject | null> {
  const set: Record<string, unknown> = { updatedAt: new Date() }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) set[key] = value
  }

  const rows = await db
    .update(brainrotProjects)
    .set(set)
    .where(and(eq(brainrotProjects.id, projectId), eq(brainrotProjects.userId, userId)))
    .returning()

  return rows[0] ? rowToProject(rows[0]) : null
}

export async function getBrainrotProjectForUser(
  projectId: string,
  userId: string,
): Promise<BrainrotProject | null> {
  const rows = await db
    .select()
    .from(brainrotProjects)
    .where(and(eq(brainrotProjects.id, projectId), eq(brainrotProjects.userId, userId)))
    .limit(1)
  return rows[0] ? rowToProject(rows[0]) : null
}

export async function listBrainrotProjectsForUser(
  userId: string,
  limit = 60,
): Promise<BrainrotProject[]> {
  const rows = await db
    .select()
    .from(brainrotProjects)
    .where(eq(brainrotProjects.userId, userId))
    .orderBy(desc(brainrotProjects.createdAt))
    .limit(limit)
  return rows.map(rowToProject)
}

export async function deleteBrainrotProjectForUser(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .delete(brainrotProjects)
    .where(and(eq(brainrotProjects.id, projectId), eq(brainrotProjects.userId, userId)))
    .returning({ id: brainrotProjects.id })
  return rows.length > 0
}
