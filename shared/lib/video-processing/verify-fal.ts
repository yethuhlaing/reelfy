const JWKS_URL = 'https://rest.alpha.fal.ai/.well-known/jwks.json'
const REPLAY_WINDOW_SECONDS = 60 * 5

type Jwk = {
  kty: string
  crv?: string
  x?: string
  kid?: string
}

let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null
const JWKS_TTL_MS = 60 * 60 * 1000

async function fetchJwks(): Promise<Jwk[]> {
  const now = Date.now()
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys
  const res = await fetch(JWKS_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch fal JWKS: ${res.status}`)
  const data = (await res.json()) as { keys: Jwk[] }
  jwksCache = { keys: data.keys, fetchedAt: now }
  return data.keys
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4))
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

async function importEd25519PublicKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'Ed25519' },
    false,
    ['verify'],
  )
}

export interface FalWebhookHeaders {
  requestId: string
  userId: string
  timestamp: string
  signature: string
}

export function readFalHeaders(req: Request): FalWebhookHeaders | null {
  const requestId = req.headers.get('x-fal-webhook-request-id')
  const userId = req.headers.get('x-fal-webhook-user-id')
  const timestamp = req.headers.get('x-fal-webhook-timestamp')
  const signature = req.headers.get('x-fal-webhook-signature')
  if (!requestId || !userId || !timestamp || !signature) return null
  return { requestId, userId, timestamp, signature }
}

export async function verifyFalWebhook(
  headers: FalWebhookHeaders,
  rawBody: ArrayBuffer,
): Promise<boolean> {
  const ts = parseInt(headers.timestamp, 10)
  if (!Number.isFinite(ts)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - ts) > REPLAY_WINDOW_SECONDS) return false

  const bodyHashBuf = await crypto.subtle.digest('SHA-256', rawBody)
  const bodyHashHex = Array.from(new Uint8Array(bodyHashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const message = new TextEncoder().encode(
    `${headers.requestId}\n${headers.userId}\n${headers.timestamp}\n${bodyHashHex}`,
  )
  const sig = hexToBytes(headers.signature)

  const keys = await fetchJwks()
  for (const jwk of keys) {
    if (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || !jwk.x) continue
    try {
      const key = await importEd25519PublicKey(jwk)
      const ok = await crypto.subtle.verify('Ed25519', key, new Uint8Array(sig), message)
      if (ok) return true
    } catch {
      continue
    }
  }
  return false
}

// Avoid unused export warning if b64url helper added later.
void b64urlToBytes
