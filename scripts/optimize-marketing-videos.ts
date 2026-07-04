/**
 * Re-encode public/videos/*.mp4 for smooth web playback.
 * Typical result: ~23 MB → ~1–2 MB (1080p max, CRF 28, no audio, faststart).
 *
 * Usage: pnpm optimize:marketing-videos
 * Then:  pnpm upload:marketing-videos
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VIDEOS_DIR = path.join(ROOT, 'public', 'videos')
const BACKUP_DIR = path.join(ROOT, 'public', 'videos-original')
const MAX_WIDTH = 1080
const CRF = 28

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function optimizeFile(inputPath: string, outputPath: string): boolean {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      inputPath,
      '-vf',
      `scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      String(CRF),
      '-movflags',
      '+faststart',
      '-an',
      outputPath,
    ],
    { stdio: 'pipe', encoding: 'utf8' },
  )

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    return false
  }
  return true
}

async function main() {
  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error(`Videos directory not found: ${VIDEOS_DIR}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(VIDEOS_DIR)
    .filter((name) => name.endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (files.length === 0) {
    console.error('No .mp4 files in public/videos/')
    process.exit(1)
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true })

  console.log(`Optimizing ${files.length} videos (max ${MAX_WIDTH}px, CRF ${CRF})...\n`)

  let totalBefore = 0
  let totalAfter = 0

  for (const filename of files) {
    const inputPath = path.join(VIDEOS_DIR, filename)
    const backupPath = path.join(BACKUP_DIR, filename)
    const tempPath = path.join(VIDEOS_DIR, `.${filename}.tmp.mp4`)
    const before = fs.statSync(inputPath).size
    totalBefore += before

    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(inputPath, backupPath)
    }

    process.stdout.write(`  ${filename} (${formatMb(before)}) … `)

    if (!optimizeFile(inputPath, tempPath)) {
      console.log('FAILED')
      fs.rmSync(tempPath, { force: true })
      process.exit(1)
    }

    fs.renameSync(tempPath, inputPath)
    const after = fs.statSync(inputPath).size
    totalAfter += after
    const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0
    console.log(`${formatMb(after)} (−${pct}%)`)
  }

  console.log(
    `\nDone. ${formatMb(totalBefore)} → ${formatMb(totalAfter)} total.`,
  )
  console.log(`Originals backed up to public/videos-original/`)
  console.log('\nRe-upload to Blob: pnpm upload:marketing-videos')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
