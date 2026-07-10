/**
 * Upload public/videos/*.mp4 to Cloudflare R2 at marketing/videos/{name}.
 *
 * Usage:
 *   pnpm optimize:marketing-videos   # compress for web first (recommended)
 *   pnpm upload:marketing-videos
 * Requires in .env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, NEXT_PUBLIC_CDN_URL
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env')
const VIDEOS_DIR = path.join(ROOT, 'public', 'videos')
const BLOB_PREFIX = 'marketing/videos'

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

async function main() {
  loadEnvFile()
  // Script only needs R2 creds; skip full app env validation.
  process.env.SKIP_ENV_VALIDATION ??= '1'

  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME
  ) {
    console.error('Missing R2 credentials in .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)')
    process.exit(1)
  }
  if (!process.env.NEXT_PUBLIC_CDN_URL) {
    console.error('Missing NEXT_PUBLIC_CDN_URL in .env')
    process.exit(1)
  }

  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error(`Videos directory not found: ${VIDEOS_DIR}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(VIDEOS_DIR)
    .filter((name) => name.endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (files.length === 0) {
    console.error('No .mp4 files found in public/videos/')
    process.exit(1)
  }

  const { uploadObject } = await import('@/shared/lib/storage/r2')

  console.log(`Uploading ${files.length} videos to R2 (${BLOB_PREFIX}/)...`)

  for (const filename of files) {
    const filePath = path.join(VIDEOS_DIR, filename)
    const data = fs.readFileSync(filePath)
    const url = await uploadObject(`${BLOB_PREFIX}/${filename}`, data, 'video/mp4')
    const sizeMb = (data.length / (1024 * 1024)).toFixed(1)
    console.log(`  ✓ ${filename} (${sizeMb} MB) → ${url}`)
  }

  console.log('\nDone. Ensure NEXT_PUBLIC_CDN_URL is set in .env and Vercel, then restart dev server.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
