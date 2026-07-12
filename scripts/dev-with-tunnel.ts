/**
 * Starts cloudflared quick tunnel, updates WEBHOOK_BASE_URL in .env, then runs next dev.
 * Skip tunnel: WEBHOOK_SKIP_TUNNEL=1 pnpm dev
 * Requires: cloudflared (brew install cloudflare/cloudflare/cloudflared)
 */
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_PATH = path.join(ROOT, '.env')
const PORT = process.env.PORT ?? '3000'
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

function updateEnvKey(key: string, value: string) {
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

function waitForTunnelUrl(proc: ChildProcess, timeoutMs = 90_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = ''
    const onData = (chunk: Buffer) => {
      buf += chunk.toString()
      const match = buf.match(TUNNEL_URL_RE)
      if (match) {
        cleanup()
        resolve(match[0])
      }
    }
    const cleanup = () => {
      clearTimeout(timer)
      proc.stdout?.off('data', onData)
      proc.stderr?.off('data', onData)
    }
    proc.stdout?.on('data', onData)
    proc.stderr?.on('data', onData)
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for cloudflared tunnel URL (90s)'))
    }, timeoutMs)
  })
}

function runNext(extraEnv: Record<string, string>): ChildProcess {
  return spawn('pnpm', ['exec', 'next', 'dev', '-p', PORT], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  })
}

let tunnelProc: ChildProcess | null = null
let nextProc: ChildProcess | null = null

function shutdown(code = 0) {
  nextProc?.kill('SIGTERM')
  tunnelProc?.kill('SIGTERM')
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function main() {
  if (process.env.WEBHOOK_SKIP_TUNNEL === '1') {
    console.log('[dev] WEBHOOK_SKIP_TUNNEL=1 — starting Next.js without tunnel')
    nextProc = runNext({})
    nextProc.on('exit', (code) => process.exit(code ?? 0))
    return
  }

  console.log(`[dev] Starting cloudflared tunnel → http://127.0.0.1:${PORT}`)

  tunnelProc = spawn(
    'cloudflared',
    ['tunnel', '--url', `http://127.0.0.1:${PORT}`],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  const tunnelFailed = new Promise<never>((_, reject) => {
    tunnelProc!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'cloudflared not found. Install: brew install cloudflare/cloudflare/cloudflared\n' +
              'Or run without tunnel: WEBHOOK_SKIP_TUNNEL=1 pnpm dev',
          ),
        )
      } else {
        reject(err)
      }
    })
    tunnelProc!.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`cloudflared exited with code ${code}`))
      }
    })
  })

  let tunnelUrl: string
  try {
    tunnelUrl = await Promise.race([waitForTunnelUrl(tunnelProc), tunnelFailed])
  } catch (err) {
    console.error('[dev]', err instanceof Error ? err.message : err)
    shutdown(1)
    return
  }

  const trimmed = tunnelUrl.replace(/\/$/, '')
  updateEnvKey('WEBHOOK_BASE_URL', trimmed)

  console.log(`[dev] WEBHOOK_BASE_URL → ${trimmed}`)
  console.log('[dev] Updated .env — Fal webhooks will use this URL until you stop dev')

  nextProc = runNext({
    WEBHOOK_BASE_URL: trimmed,
  })

  nextProc.on('exit', (code) => shutdown(code ?? 0))
}

main().catch((err) => {
  console.error('[dev]', err)
  shutdown(1)
})
