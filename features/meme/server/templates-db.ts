import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { memeTemplates } from '@/shared/lib/db/schema'
import type { MemeTemplate, MemeTextBox } from '@/shared/lib/types'

/** Shape returned by retrieval — the template plus its cosine distance. */
export interface RankedTemplate extends MemeTemplate {
  distance: number
}

function rowToTemplate(row: typeof memeTemplates.$inferSelect): MemeTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.imageUrl,
    width: row.width,
    height: row.height,
    description: row.description,
    captionGuide: row.captionGuide,
    textBoxes: (row.textBoxes as MemeTextBox[]) ?? [],
    boxRoles: (row.boxRoles as string[]) ?? [],
    examples: (row.examples as string[][]) ?? [],
    toneTags: (row.toneTags as string[]) ?? [],
    trendingScore: row.trendingScore,
    source: row.source as MemeTemplate['source'],
  }
}

/**
 * Retrieve the top-K templates for a query embedding via pgvector cosine
 * distance, then bias the ordering by trendingScore (lightweight trend boost).
 *
 * `<=>` is pgvector cosine distance (0 = identical). We subtract a small
 * trending nudge so a slightly-worse-but-trending template can win.
 */
export async function retrieveTemplates(
  queryEmbedding: number[],
  limit = 3,
): Promise<RankedTemplate[]> {
  const vectorLiteral = `[${queryEmbedding.join(',')}]`
  // Fetch a wider candidate set, re-rank with trend boost, then slice to limit.
  const candidateCount = Math.max(limit * 4, 12)

  const rows = await db
    .select({
      row: memeTemplates,
      distance: sql<number>`${memeTemplates.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(memeTemplates)
    .where(and(eq(memeTemplates.active, true), sql`${memeTemplates.embedding} IS NOT NULL`))
    .orderBy(sql`${memeTemplates.embedding} <=> ${vectorLiteral}::vector`)
    .limit(candidateCount)

  const ranked = rows
    .map(({ row, distance }) => ({
      ...rowToTemplate(row),
      // Trend boost: shave up to ~0.05 distance for the hottest templates.
      distance: distance - Math.min(row.trendingScore, 1) * 0.05,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return ranked
}

export async function getTemplateById(id: string): Promise<MemeTemplate | null> {
  const rows = await db.select().from(memeTemplates).where(eq(memeTemplates.id, id)).limit(1)
  return rows[0] ? rowToTemplate(rows[0]) : null
}

/** Upsert a template by slug (used by the seed script). */
export async function upsertTemplate(input: {
  id: string
  slug: string
  name: string
  imageUrl: string
  width: number
  height: number
  description: string
  captionGuide: string
  textBoxes: MemeTextBox[]
  boxRoles: string[]
  examples: string[][]
  toneTags: string[]
  embedding: number[]
  source: string
  license?: string | null
}): Promise<void> {
  await db
    .insert(memeTemplates)
    .values({
      id: input.id,
      slug: input.slug,
      name: input.name,
      imageUrl: input.imageUrl,
      width: input.width,
      height: input.height,
      description: input.description,
      captionGuide: input.captionGuide,
      textBoxes: input.textBoxes,
      boxRoles: input.boxRoles,
      examples: input.examples,
      toneTags: input.toneTags,
      embedding: input.embedding,
      source: input.source,
      license: input.license ?? null,
    })
    .onConflictDoUpdate({
      target: memeTemplates.slug,
      set: {
        name: input.name,
        imageUrl: input.imageUrl,
        width: input.width,
        height: input.height,
        description: input.description,
        captionGuide: input.captionGuide,
        textBoxes: input.textBoxes,
        boxRoles: input.boxRoles,
        examples: input.examples,
        toneTags: input.toneTags,
        embedding: input.embedding,
        source: input.source,
        license: input.license ?? null,
        updatedAt: new Date(),
      },
    })
}
