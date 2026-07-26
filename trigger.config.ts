import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from '@trigger.dev/sdk/v3'
import { syncEnvVars } from '@trigger.dev/build/extensions/core'

/** Keys the worker must not inherit from the Next app .env */
const SKIP = new Set([
  'TRIGGER_SECRET_KEY', // Next app only — Trigger cloud auth is separate
  'PORT',
  'WEBHOOK_SKIP_TUNNEL',
  'SKIP_ENV_VALIDATION',
])

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) out[key] = value
  }
  return out
}

export default defineConfig({
  project: 'proj_igsrxwzkutxbnuwyjabp',
  runtime: 'node',
  dirs: ['features/chat/trigger'],
  maxDuration: 1800,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
    },
  },
  build: {
    extensions: [
      // On `trigger deploy`, push local .env → Trigger Cloud env vars
      syncEnvVars(async () => {
        const envPath = resolve(process.cwd(), '.env')
        if (!existsSync(envPath)) {
          throw new Error('Missing .env — needed to sync env vars on deploy')
        }
        const parsed = parseEnvFile(envPath)
        return Object.fromEntries(
          Object.entries(parsed).filter(([key, value]) => value && !SKIP.has(key)),
        )
      }),
    ],
  },
})
