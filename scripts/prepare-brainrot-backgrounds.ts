/**
 * Convert gameplay sources into chunked MP4s for brainrot ingest.
 *
 * Input layout:
 *   public/brainrots/{category}/{video}.webm|mkv|mp4|mov
 *
 * Output layout (used by pnpm ingest:brainrot):
 *   brainrot-sources/{category}/chunk-00.mp4          (one source per category)
 *   brainrot-sources/{category}/chunk-01.mp4
 *   ...
 *   brainrot-sources/{category}/{slug}-chunk-00.mp4   (multiple sources)
 *
 * Usage:
 *   pnpm prepare:brainrot
 *   pnpm ingest:brainrot
 *
 * Performance (Mac):
 *   - Defaults to Apple VideoToolbox (GPU) instead of libx264 (CPU).
 *   - Encodes + chunks in a single ffmpeg pass.
 *
 * Optional env:
 *   BRAINROT_ENCODER=hardware|software|auto   (default: auto)
 *   BRAINROT_LOW_POWER=1                      (lower CPU priority + fewer threads)
 *   BRAINROT_SKIP_EXISTING=1                (skip videos already converted)
 *   BRAINROT_CATEGORIES=subway-surfers,valorant   (only these categories)
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const INPUT_DIR = path.join(ROOT, 'public', 'brainrots')
const OUTPUT_DIR = path.join(ROOT, 'brainrot-sources')
const CHUNK_SEC = 30
const SOURCE_EXTS = new Set(['.webm', '.mkv', '.mp4', '.mov'])
const CATEGORY_FILTER = process.env.BRAINROT_CATEGORIES?.split(',').map((s) => s.trim()).filter(Boolean)
const VIDEO_FILTER =
  'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'

type EncoderMode = 'hardware' | 'software'

function slugify(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function hasVideotoolboxEncoder(): boolean {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {
    stdio: 'pipe',
    encoding: 'utf8',
  })
  return result.stdout.includes('h264_videotoolbox')
}

function resolveEncoder(): { mode: EncoderMode; label: string } {
  const pref = process.env.BRAINROT_ENCODER?.toLowerCase()
  if (pref === 'software') {
    return { mode: 'software', label: 'libx264 (software, CPU-heavy)' }
  }
  if (pref === 'hardware') {
    return { mode: 'hardware', label: 'h264_videotoolbox (hardware)' }
  }
  if (process.platform === 'darwin' && hasVideotoolboxEncoder()) {
    return { mode: 'hardware', label: 'h264_videotoolbox (hardware, Mac GPU)' }
  }
  return { mode: 'software', label: 'libx264 (software)' }
}

function threadCount(lowPower: boolean): number {
  if (!lowPower) return Math.max(2, Math.floor(os.cpus().length / 2))
  return 2
}

function runFfmpeg(args: string[], lowPower: boolean): void {
  const command = lowPower && process.platform !== 'win32'
    ? ['nice', '-n', '10', 'ffmpeg', ...args]
    : ['ffmpeg', ...args]

  const result = spawnSync(command[0]!, command.slice(1), {
    stdio: 'pipe',
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'ffmpeg failed')
  }
}

function buildEncodeArgs(
  inputPath: string,
  chunkPattern: string,
  encoder: EncoderMode,
  lowPower: boolean,
): string[] {
  const common = [
    '-y',
    '-i',
    inputPath,
    '-an',
    '-vf',
    VIDEO_FILTER,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-f',
    'segment',
    '-segment_time',
    String(CHUNK_SEC),
    '-reset_timestamps',
    '1',
    chunkPattern,
  ]

  if (encoder === 'hardware') {
    return [
      ...common.slice(0, 6),
      '-c:v',
      'h264_videotoolbox',
      '-q:v',
      lowPower ? '55' : '65',
      '-allow_sw',
      '1',
      ...common.slice(6),
    ]
  }

  return [
    ...common.slice(0, 6),
    '-c:v',
    'libx264',
    '-preset',
    lowPower ? 'veryfast' : 'fast',
    '-crf',
    '23',
    '-threads',
    String(threadCount(lowPower)),
    ...common.slice(6),
  ]
}

function ensureFfmpeg(): void {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe', encoding: 'utf8' })
  if (result.status !== 0) {
    console.error('ffmpeg is required. Install it and ensure it is on your PATH.')
    process.exit(1)
  }
}

function chunkPrefix(singleSource: boolean, videoSlug: string): string {
  return singleSource ? 'chunk-' : `${videoSlug}-chunk-`
}

function existingChunkCount(
  categoryOut: string,
  videoSlug: string,
  singleSource: boolean,
  sourceMtimeMs: number,
): number | null {
  const prefix = chunkPrefix(singleSource, videoSlug)
  const chunks = fs
    .readdirSync(categoryOut)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (chunks.length === 0) return null

  const allFresh = chunks.every((name) => {
    const stat = fs.statSync(path.join(categoryOut, name))
    return stat.mtimeMs >= sourceMtimeMs
  })

  return allFresh ? chunks.length : null
}

function convertAndChunk(
  inputPath: string,
  categoryId: string,
  videoSlug: string,
  singleSource: boolean,
  encoder: EncoderMode,
  lowPower: boolean,
  skipExisting: boolean,
): number {
  const categoryOut = path.join(OUTPUT_DIR, categoryId)
  fs.mkdirSync(categoryOut, { recursive: true })

  const sourceMtimeMs = fs.statSync(inputPath).mtimeMs
  if (skipExisting) {
    const existing = existingChunkCount(categoryOut, videoSlug, singleSource, sourceMtimeMs)
    if (existing != null) {
      console.log(`  skipping ${path.basename(inputPath)} (${existing} existing chunk(s))`)
      return existing
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainrot-'))
  const chunkPattern = path.join(tempDir, 'chunk-%02d.mp4')

  try {
    console.log(`  encoding + chunking ${path.basename(inputPath)} …`)
    runFfmpeg(buildEncodeArgs(inputPath, chunkPattern, encoder, lowPower), lowPower)

    const chunks = fs
      .readdirSync(tempDir)
      .filter((name) => /^chunk-\d+\.mp4$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    if (chunks.length === 0) {
      throw new Error('No chunks produced')
    }

    const prefix = chunkPrefix(singleSource, videoSlug)
    for (let i = 0; i < chunks.length; i++) {
      const outName = `${prefix}${String(i).padStart(2, '0')}.mp4`
      const outPath = path.join(categoryOut, outName)
      fs.copyFileSync(path.join(tempDir, chunks[i]!), outPath)
      console.log(`    ✓ ${categoryId}/${outName}`)
    }

    return chunks.length
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function main() {
  ensureFfmpeg()

  const lowPower = process.env.BRAINROT_LOW_POWER === '1'
  const skipExisting = process.env.BRAINROT_SKIP_EXISTING === '1'
  const encoder = resolveEncoder()

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Create ${INPUT_DIR}/{category}/{video}.mkv with your source files.`)
    process.exit(1)
  }

  const categories = fs.readdirSync(INPUT_DIR).filter((name) => {
    const p = path.join(INPUT_DIR, name)
    return fs.statSync(p).isDirectory() && (!CATEGORY_FILTER?.length || CATEGORY_FILTER.includes(name))
  })

  if (categories.length === 0) {
    console.error('No category folders found in public/brainrots/')
    console.error('Expected: public/brainrots/{category}/{video}.webm')
    process.exit(1)
  }

  console.log(`Encoder: ${encoder.label}`)
  if (lowPower) console.log('Low-power mode: on (reduced priority + gentler settings)')
  if (skipExisting) console.log('Skip existing: on')

  let totalVideos = 0
  let totalChunks = 0

  for (const categoryId of categories) {
    const categoryDir = path.join(INPUT_DIR, categoryId)
    const sources = fs
      .readdirSync(categoryDir)
      .filter((name) => SOURCE_EXTS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    if (sources.length === 0) continue

    const singleSource = sources.length === 1
    console.log(`\n${categoryId} (${sources.length} video${sources.length === 1 ? '' : 's'})`)

    for (const file of sources) {
      const videoSlug = slugify(file)
      const chunkCount = convertAndChunk(
        path.join(categoryDir, file),
        categoryId,
        videoSlug,
        singleSource,
        encoder.mode,
        lowPower,
        skipExisting,
      )
      totalVideos += 1
      totalChunks += chunkCount
    }
  }

  if (totalVideos === 0) {
    console.error('No source videos found under public/brainrots/{category}/ (.webm, .mkv, .mp4, .mov)')
    process.exit(1)
  }

  console.log(`\nPrepared ${totalVideos} video(s), ${totalChunks} chunk(s) in brainrot-sources/`)
  console.log('Next: pnpm ingest:brainrot')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
