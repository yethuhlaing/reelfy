/**
 * Ingest vertical gameplay sources into R2 and regenerate gameplay-catalog.ts.
 *
 * Layouts supported:
 *
 * Flat (one video per category — no template folders):
 *   brainrot-sources/{category}/chunk-00.mp4
 *   brainrot-sources/{category}/chunk-01.mp4
 *
 * Flat with multiple sources in one category:
 *   brainrot-sources/{category}/{slug}-chunk-00.mp4
 *
 * Template folders (legacy minecraft):
 *   brainrot-sources/{category}/template-02/chunk-00.mp4
 *
 * From sources in public/brainrots/, run first:
 *   pnpm prepare:brainrot
 *
 * Usage:
 *   pnpm ingest:brainrot
 *   BRAINROT_CATEGORIES=subway-surfers,valorant pnpm ingest:brainrot
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env')
const SOURCES_DIR = path.join(ROOT, 'brainrot-sources')
const CATALOG_PATH = path.join(ROOT, 'shared', 'data', 'gameplay-catalog.ts')
const CHUNK_SEC = 30
const R2_PREFIX = process.env.BRAINROT_R2_PREFIX ?? 'brainrot-template'
const TEMPLATE_DIR_RE = /^template-(\d+)$/i
const CATEGORY_FILTER = process.env.BRAINROT_CATEGORIES?.split(',').map((s) => s.trim()).filter(Boolean)
const SLUG_CHUNK_RE = /^(.+)-chunk-(\d+)\.mp4$/i

/**
 * Grab a poster frame (~1s in) from a chunk as a downscaled JPG.
 * Returns null if ffmpeg is missing or extraction fails — caller falls back to a
 * static placeholder so ingest never hard-fails on thumbnails.
 */
function extractThumbnail(videoPath: string): Buffer | null {
  const out = path.join(os.tmpdir(), `brainrot-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)
  const res = spawnSync(
    'ffmpeg',
    ['-y', '-ss', '1', '-i', videoPath, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', out],
    { stdio: 'pipe', encoding: 'utf8' },
  )
  if (res.status !== 0 || !fs.existsSync(out)) return null
  try {
    return fs.readFileSync(out)
  } finally {
    if (fs.existsSync(out)) fs.unlinkSync(out)
  }
}

type CatalogChunk = { index: number; url: string; durationSec: number }
type CatalogVideo = {
  id: string
  label: string
  thumbnailUrl: string
  chunks: CatalogChunk[]
}
type CatalogCategory = {
  id: string
  label: string
  thumbnailUrl: string
  videos: CatalogVideo[]
}

function loadEnvFile(): void {
  if (!fs.existsSync(ENV_PATH)) return
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function chunkIndexFromFilename(file: string): number {
  const match = file.match(/(?:^|-)chunk-(\d+)\.mp4$/i)
  return match ? Number.parseInt(match[1]!, 10) : 0
}

function listChunkFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.mp4') && /(?:^|-)chunk-\d+\.mp4$/i.test(name))
    .sort((a, b) => chunkIndexFromFilename(a) - chunkIndexFromFilename(b))
}

function titleCaseCategory(id: string): string {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type VideoSource = {
  videoId: string
  label: string
  r2Folder: string
  localDir: string
  chunkFiles: string[]
}

function groupFlatChunks(categoryId: string, categoryDir: string): VideoSource[] {
  const files = listChunkFiles(categoryDir)
  if (files.length === 0) return []

  const plain = files.filter((f) => /^chunk-\d+\.mp4$/i.test(f))
  if (plain.length > 0) {
    return [{
      videoId: categoryId,
      label: titleCaseCategory(categoryId),
      r2Folder: '',
      localDir: categoryDir,
      chunkFiles: plain,
    }]
  }

  const bySlug = new Map<string, string[]>()
  for (const file of files) {
    const match = file.match(SLUG_CHUNK_RE)
    const slug = match?.[1] ?? 'main'
    const list = bySlug.get(slug) ?? []
    list.push(file)
    bySlug.set(slug, list)
  }

  return [...bySlug.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, chunkFiles]) => ({
      videoId: slug,
      label: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      r2Folder: slug,
      localDir: categoryDir,
      chunkFiles: chunkFiles.sort((a, b) => chunkIndexFromFilename(a) - chunkIndexFromFilename(b)),
    }))
}

function discoverVideoSources(categoryId: string, categoryDir: string): VideoSource[] {
  const templateDirs = fs
    .readdirSync(categoryDir)
    .filter((name) => {
      const p = path.join(categoryDir, name)
      return fs.statSync(p).isDirectory() && TEMPLATE_DIR_RE.test(name)
    })
    .sort((a, b) => (templateNumFromDir(a) ?? 0) - (templateNumFromDir(b) ?? 0))

  if (templateDirs.length > 0) {
    return templateDirs.flatMap((templateDir) => {
      const templateNum = templateNumFromDir(templateDir)!
      const templateNumStr = String(templateNum).padStart(2, '0')
      const chunkFiles = listChunkFiles(path.join(categoryDir, templateDir))
      if (chunkFiles.length === 0) return []
      return [{
        videoId: `brainrot-template-${categoryId}-${templateNumStr}`,
        label: `Brainrot Template ${templateNumStr}`,
        r2Folder: `template-${templateNumStr}`,
        localDir: path.join(categoryDir, templateDir),
        chunkFiles,
      }]
    })
  }

  const subdirs = fs
    .readdirSync(categoryDir)
    .filter((name) => {
      const p = path.join(categoryDir, name)
      return fs.statSync(p).isDirectory() && !TEMPLATE_DIR_RE.test(name) && !name.startsWith('.')
    })
    .sort((a, b) => a.localeCompare(b))

  const fromSubdirs = subdirs.flatMap((subdir) => {
    const localDir = path.join(categoryDir, subdir)
    const chunkFiles = listChunkFiles(localDir)
    if (chunkFiles.length === 0) return []
    return [{
      videoId: subdir,
      label: subdir.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      r2Folder: subdir,
      localDir,
      chunkFiles,
    }]
  })
  if (fromSubdirs.length > 0) return fromSubdirs

  return groupFlatChunks(categoryId, categoryDir)
}

async function uploadVideoSource(
  categoryId: string,
  source: VideoSource,
  uploadObject: (key: string, data: Buffer, contentType: string) => Promise<string>,
): Promise<CatalogVideo | null> {
  if (source.chunkFiles.length === 0) return null

  const chunks: CatalogChunk[] = []
  let firstChunkLocalPath: string | null = null

  for (const file of source.chunkFiles) {
    const chunkIndex = chunkIndexFromFilename(file)
    const localPath = path.join(source.localDir, file)
    if (chunkIndex === 0 || firstChunkLocalPath === null) firstChunkLocalPath = localPath
    const data = fs.readFileSync(localPath)
    const r2Base = source.r2Folder
      ? `${R2_PREFIX}/${categoryId}/${source.r2Folder}`
      : `${R2_PREFIX}/${categoryId}`
    const key = `${r2Base}/chunk-${String(chunkIndex).padStart(2, '0')}.mp4`
    const url = await uploadObject(key, data, 'video/mp4')
    chunks.push({ index: chunkIndex, url, durationSec: CHUNK_SEC })
    console.log(`  ✓ ${categoryId}/${file} → ${url}`)
  }

  const thumbBase = source.r2Folder
    ? `${R2_PREFIX}/${categoryId}/${source.r2Folder}`
    : `${R2_PREFIX}/${categoryId}`
  const thumbKey = `${thumbBase}/thumb.jpg`
  let thumbnailUrl = '/placeholder-brainrot.png'
  const thumbBuf = firstChunkLocalPath ? extractThumbnail(firstChunkLocalPath) : null
  if (thumbBuf) {
    thumbnailUrl = await uploadObject(thumbKey, thumbBuf, 'image/jpeg')
    console.log(`  ✓ ${categoryId}/${source.videoId}/thumb.jpg → ${thumbnailUrl}`)
  } else {
    console.warn(`  ! ${categoryId}/${source.videoId} — no thumbnail (ffmpeg missing?), using placeholder`)
  }

  return {
    id: source.videoId,
    label: source.label,
    thumbnailUrl,
    chunks,
  }
}

function templateNumFromDir(name: string): number | null {
  const match = name.match(TEMPLATE_DIR_RE)
  return match ? Number.parseInt(match[1]!, 10) : null
}

function loadExistingCatalog(): CatalogCategory[] {
  if (!fs.existsSync(CATALOG_PATH)) return []
  const source = fs.readFileSync(CATALOG_PATH, 'utf8')
  const match = source.match(/export const GAMEPLAY_CATALOG[^=]*=\s*(\[[\s\S]*\])\s*\n/)
  if (!match?.[1]) return []
  try {
    return JSON.parse(match[1]) as CatalogCategory[]
  } catch {
    return []
  }
}

function mergeCatalog(
  existing: CatalogCategory[],
  uploaded: CatalogCategory[],
): CatalogCategory[] {
  const byId = new Map(existing.map((category) => [category.id, category]))

  for (const category of uploaded) {
    const prev = byId.get(category.id)
    if (!prev) {
      byId.set(category.id, category)
      continue
    }

    const videosById = new Map(prev.videos.map((video) => [video.id, video]))
    for (const video of category.videos) {
      videosById.set(video.id, video)
    }

    const videos = [...videosById.values()].sort((a, b) => {
      const aNum = Number.parseInt(a.id.match(/-(\d+)$/)?.[1] ?? '0', 10)
      const bNum = Number.parseInt(b.id.match(/-(\d+)$/)?.[1] ?? '0', 10)
      return aNum - bNum
    })

    byId.set(category.id, {
      ...prev,
      thumbnailUrl: videos[0]?.thumbnailUrl ?? prev.thumbnailUrl,
      videos,
    })
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function writeCatalog(catalog: CatalogCategory[]): void {
  const ts = `export type GameplayChunk = { index: number; url: string; durationSec: number }

export type GameplayVideo = {
  id: string
  label: string
  thumbnailUrl: string
  chunks: GameplayChunk[]
}

export type GameplayCategory = {
  id: string
  label: string
  thumbnailUrl: string
  videos: GameplayVideo[]
}

/** Auto-generated by pnpm ingest:brainrot — do not edit by hand. */
export const GAMEPLAY_CATALOG: GameplayCategory[] = ${JSON.stringify(catalog, null, 2)}

export function getGameplayCategory(id: string): GameplayCategory | undefined {
  return GAMEPLAY_CATALOG.find((c) => c.id === id)
}
`
  fs.writeFileSync(CATALOG_PATH, ts)
}

async function main() {
  loadEnvFile()
  process.env.SKIP_ENV_VALIDATION ??= '1'

  if (!fs.existsSync(SOURCES_DIR)) {
    console.error(`Create ${SOURCES_DIR}/{category}/chunk-00.mp4`)
    process.exit(1)
  }

  const { uploadObject } = await import('@/shared/lib/storage/r2')

  const categories = fs.readdirSync(SOURCES_DIR).filter((name) => {
    const p = path.join(SOURCES_DIR, name)
    return fs.statSync(p).isDirectory() && !name.startsWith('.') && (!CATEGORY_FILTER?.length || CATEGORY_FILTER.includes(name))
  })

  if (categories.length === 0) {
    console.error('No category folders found in brainrot-sources/')
    process.exit(1)
  }

  const uploadedCategories: CatalogCategory[] = []

  for (const categoryId of categories) {
    const categoryDir = path.join(SOURCES_DIR, categoryId)
    const sources = discoverVideoSources(categoryId, categoryDir)

    if (sources.length === 0) {
      console.warn(`\n${categoryId}: no chunks found (expected chunk-00.mp4 or template-02/chunk-00.mp4)`)
      continue
    }

    console.log(`\n${categoryId} (${sources.length} video${sources.length === 1 ? '' : 's'})`)
    const videos: CatalogVideo[] = []

    for (const source of sources) {
      const video = await uploadVideoSource(categoryId, source, uploadObject)
      if (video) videos.push(video)
    }

    if (videos.length > 0) {
      uploadedCategories.push({
        id: categoryId,
        label: titleCaseCategory(categoryId),
        thumbnailUrl: videos[0]!.thumbnailUrl,
        videos,
      })
    }
  }

  if (uploadedCategories.length === 0) {
    console.error('\nNothing uploaded. Expected brainrot-sources/{category}/chunk-00.mp4')
    process.exit(1)
  }

  const catalog = mergeCatalog(loadExistingCatalog(), uploadedCategories)
  writeCatalog(catalog)
  console.log(`\nWrote ${CATALOG_PATH} (${catalog.length} categories, R2 prefix: ${R2_PREFIX})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
