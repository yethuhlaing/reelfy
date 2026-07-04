/**
 * Upload public/videos/*.mp4 to Vercel Blob at marketing/videos/{name}.
 * Sets NEXT_PUBLIC_BLOB_STORAGE_URL in .env.
 *
 * Usage: pnpm upload:marketing-videos
 * Requires: BLOB_READ_WRITE_TOKEN in .env
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { put } from '@vercel/blob'

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

function removeEnvKey(key: string): void {
  if (!fs.existsSync(ENV_PATH)) return
  const content = fs.readFileSync(ENV_PATH, 'utf8')
  const next = content
    .split('\n')
    .filter((line) => !line.startsWith(`${key}=`))
    .join('\n')
  fs.writeFileSync(ENV_PATH, next.endsWith('\n') ? next : `${next}\n`)
}

function updateEnvKey(key: string, value: string): void {
  if (!fs.existsSync(ENV_PATH)) {
    fs.writeFileSync(ENV_PATH, `${key}=${value}\n`)
    return
  }
  let content = fs.readFileSync(ENV_PATH, 'utf8')
  const line = `${key}=${value}`
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, line)
  } else {
    content = content.endsWith('\n') ? `${content}${line}\n` : `${content}\n${line}\n`
  }
  fs.writeFileSync(ENV_PATH, content)
}

function blobStorageUrlFromPutUrl(url: string): string {
  return new URL(url).origin
}

async function main() {
  loadEnvFile()

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    console.error('Missing BLOB_READ_WRITE_TOKEN in .env')
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

  console.log(`Uploading ${files.length} videos to Vercel Blob (${BLOB_PREFIX}/)...`)

  let blobStorageUrl: string | undefined

  for (const filename of files) {
    const filePath = path.join(VIDEOS_DIR, filename)
    const data = fs.readFileSync(filePath)
    const blobPath = `${BLOB_PREFIX}/${filename}`

    const blob = await put(blobPath, data, {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    })

    blobStorageUrl ??= blobStorageUrlFromPutUrl(blob.url)
    const sizeMb = (data.length / (1024 * 1024)).toFixed(1)
    console.log(`  ✓ ${filename} (${sizeMb} MB)`)
  }

  if (!blobStorageUrl) {
    console.error('Upload failed — no blob URLs returned')
    process.exit(1)
  }

  updateEnvKey('NEXT_PUBLIC_BLOB_STORAGE_URL', blobStorageUrl)
  removeEnvKey('NEXT_PUBLIC_MARKETING_VIDEOS_BASE_URL')
  console.log(`\nDone. Blob storage URL written to .env:\n  NEXT_PUBLIC_BLOB_STORAGE_URL=${blobStorageUrl}`)
  console.log('\nRestart dev server to pick up the new env var.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
