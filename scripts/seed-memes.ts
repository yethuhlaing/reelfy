/**
 * Seed the meme template catalog.
 *
 * For each SEED_TEMPLATES entry: download the imgflip blank -> re-host to R2
 * -> embed (description + captionGuide) -> upsert into meme_templates.
 *
 * Usage: pnpm seed:memes
 * Requires in .env: DATABASE_URL, OPENAI_API_KEY, R2_* creds, NEXT_PUBLIC_CDN_URL
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env')

/** Parse a dotenv value: strip quotes and trailing `# comment` (like dotenv). */
function parseEnvValue(raw: string): string {
  let value = raw.trim()
  let inQuotes = false
  let quoteChar = ''
  let end = value.length
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if ((c === '"' || c === "'") && value[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = c
      } else if (c === quoteChar) {
        inQuotes = false
      }
    } else if (c === '#' && !inQuotes && (i === 0 || /\s/.test(value[i - 1] ?? ''))) {
      end = i
      break
    }
  }
  value = value.slice(0, end).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value
}

function loadEnvFile(): void {
  if (!fs.existsSync(ENV_PATH)) return
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = parseEnvValue(trimmed.slice(eq + 1))
    if (!(key in process.env)) process.env[key] = value
  }
  // Seed only needs DB + Blob + OpenAI; skip full app env validation.
  process.env.SKIP_ENV_VALIDATION ??= '1'
}

async function main() {
  loadEnvFile()

  // Import after env is loaded so env validation + db client see the values.
  const { SEED_TEMPLATES } = await import('@/features/meme/server/template-seed-data')
  const { embedText } = await import('@/features/meme/server/embeddings')
  const { uploadTemplateImage } = await import('@/features/meme/server/memes-db')
  const { upsertTemplate } = await import('@/features/meme/server/templates-db')

  console.log(`Seeding ${SEED_TEMPLATES.length} meme templates...`)

  for (const t of SEED_TEMPLATES) {
    process.stdout.write(`  ${t.slug} ... `)
    try {
      // 1. Download imgflip blank.
      const res = await fetch(t.imgflipImageUrl)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const data = Buffer.from(await res.arrayBuffer())

      // 2. Re-host to R2.
      const imageUrl = await uploadTemplateImage(t.slug, data, contentType)

      // 3. Embed description + caption guide + tone tags.
      const embedInput = [t.name, t.description, t.captionGuide, t.toneTags.join(' ')]
        .filter(Boolean)
        .join('\n')
      const embedding = await embedText(embedInput)

      // 4. Upsert.
      await upsertTemplate({
        id: randomUUID(),
        slug: t.slug,
        name: t.name,
        imageUrl,
        width: t.width,
        height: t.height,
        description: t.description,
        captionGuide: t.captionGuide,
        textBoxes: t.textBoxes,
        boxRoles: t.boxRoles,
        examples: t.examples,
        toneTags: t.toneTags,
        embedding,
        source: t.source,
        license: null,
      })
      console.log('ok')
    } catch (err) {
      console.log(`FAILED: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
