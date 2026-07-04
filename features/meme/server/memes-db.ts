import { put } from '@vercel/blob'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { memeGenerations } from '@/shared/lib/db/schema'
import { env } from '@/shared/lib/env'
import type { MemeGeneration, MemeVariant } from '@/shared/lib/types'

function hasBlobToken(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN)
}

/** Upload a rendered meme PNG to Blob and return its public URL. */
export async function uploadMemeImage(memeId: string, data: Buffer): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const blob = await put(`memes/${memeId}.png`, data, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: true,
  })
  return blob.url
}

/** Upload a template base image to Blob (used by the seed script). */
export async function uploadTemplateImage(
  slug: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (!hasBlobToken()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const ext = contentType.split('/')[1] || 'jpg'
  const blob = await put(`meme-templates/${slug}.${ext}`, data, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

function rowToGeneration(r: typeof memeGenerations.$inferSelect): MemeGeneration {
  return {
    id: r.id,
    inputText: r.inputText,
    variants: (r.variants as MemeVariant[]) ?? [],
    createdAt: r.createdAt.toISOString(),
  }
}

export async function insertGeneration(input: {
  id: string
  userId: string
  inputText: string
  variants: MemeVariant[]
  creditsCharged: number
}): Promise<void> {
  await db.insert(memeGenerations).values({
    id: input.id,
    userId: input.userId,
    inputText: input.inputText,
    variants: input.variants,
    creditsCharged: input.creditsCharged,
  })
}

export async function getGenerationForUser(
  generationId: string,
  userId: string,
): Promise<MemeGeneration | null> {
  const rows = await db
    .select()
    .from(memeGenerations)
    .where(and(eq(memeGenerations.id, generationId), eq(memeGenerations.userId, userId)))
    .limit(1)
  return rows[0] ? rowToGeneration(rows[0]) : null
}

export async function listGenerationsForUser(userId: string, limit = 60): Promise<MemeGeneration[]> {
  const rows = await db
    .select()
    .from(memeGenerations)
    .where(eq(memeGenerations.userId, userId))
    .orderBy(desc(memeGenerations.createdAt))
    .limit(limit)

  return rows.map(rowToGeneration)
}

export async function deleteGenerationForUser(
  generationId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .delete(memeGenerations)
    .where(and(eq(memeGenerations.id, generationId), eq(memeGenerations.userId, userId)))
    .returning({ id: memeGenerations.id })
  return rows.length > 0
}

export async function updateGenerationVariant(input: {
  generationId: string
  userId: string
  templateId: string
  variant: MemeVariant
}): Promise<MemeGeneration | null> {
  const existing = await getGenerationForUser(input.generationId, input.userId)
  if (!existing) return null

  const variants = existing.variants.map((v) =>
    v.templateId === input.templateId ? input.variant : v,
  )
  if (!variants.some((v) => v.templateId === input.templateId)) return null

  const rows = await db
    .update(memeGenerations)
    .set({ variants })
    .where(and(eq(memeGenerations.id, input.generationId), eq(memeGenerations.userId, input.userId)))
    .returning()

  return rows[0] ? rowToGeneration(rows[0]) : null
}
