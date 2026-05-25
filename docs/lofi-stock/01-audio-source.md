# 01 — Pixabay Audio Source

Pixabay Music API integration. One provider file, one server route, one cache layer.

## API basics

- Endpoint: `https://pixabay.com/api/videos/` (note: as of 2026-05, Pixabay's "music" search lives under a unified content endpoint; verify exact music endpoint at impl time — may be `https://pixabay.com/api/?key=...&category=music` or a dedicated `audio` endpoint).
- Auth: single API key in query string (`?key=...`)
- Rate limit: 100 req/60s per key
- Response: JSON with `hits[]`, each hit has `id`, `tags`, `duration`, `previewURL`, `downloadURL` (or equivalent)
- Licence: Pixabay Content License — free for commercial use, no attribution required, no redistribution-only (verify on https://pixabay.com/service/license-summary/ at impl time)

## Env vars

```
PIXABAY_API_KEY=...
```

Stored in `.env.local` (and Vercel project env). Never exposed to client — all Pixabay requests routed through server.

## Provider file

`shared/lib/providers/audio-stock.ts`

```ts
export interface StockAudioTrack {
  id: string                  // provider-specific track id (string)
  provider: 'pixabay'
  title: string
  tags: string[]
  durationSec: number
  previewUrl: string          // streamable 30s preview (or full track for Pixabay)
  downloadUrl: string         // full audio URL for use in ffmpeg
  licence: string             // licence summary snapshot
  attribution: string | null  // if non-null, render in video
}

export interface StockAudioProvider {
  key: 'pixabay'
  search(input: { query: string; page?: number; perPage?: number }): Promise<{ tracks: StockAudioTrack[]; total: number }>
  getById(id: string): Promise<StockAudioTrack | null>
}
```

Single implementation for Pixabay in MVP. Interface designed for future providers (Freesound, Jamendo) without refactor.

## Search route

`GET /api/lofi-stock/search?q=lofi+rain&page=1`

Server-side proxy to Pixabay (keeps API key secret + enables caching).

### Response 200
```ts
{
  tracks: StockAudioTrack[]
  total: number
  page: number
  perPage: number
}
```

### Caching

Cache key: `pixabay:search:${normalizedQuery}:${page}`
TTL: 1 hour (Upstash redis — already in stack via `@upstash/redis`)
Bypass cache via `?fresh=1` (admin/debug only)

```ts
async function searchCached(q: string, page = 1) {
  const key = `pixabay:search:${q.toLowerCase().trim()}:${page}`
  const cached = await redis.get<SearchResponse>(key)
  if (cached) return cached
  const fresh = await pixabaySearch({ query: q, page })
  await redis.set(key, fresh, { ex: 3600 })
  return fresh
}
```

## Rate limit handling

- Per-IP rate limit on `/api/lofi-stock/search` via existing `rateLimit` table: 30 searches/min/user
- Upstream Pixabay 429 → respond 503 to client with `Retry-After: 30`
- Long-term: if a single popular query gets hammered, cache hit rate solves it; if catalog-wide hit, may need a second API key rotation pool (post-MVP)

## Pixabay → DB mapping

When user picks a track and submits the video, mirror these fields into the new `lofiAssets` row:

| Pixabay field | lofiAssets column |
|---------------|-------------------|
| `id` | `sourceTrackId` |
| (constant 'pixabay') | `sourceProvider` |
| licence snapshot text | `sourceLicence` |
| `downloadURL` | `resultUrl` |
| `duration` | `durationSec` |
| `tags[].join(',')` | `prompt` (reused column — stores tags here) |

Asset created with `status='ready'` immediately (no fal job to wait on).

## URL validation at render time

Stock URLs cached at submit can 404 later. Before submitting fal compose:

```ts
async function validateStockUrl(url: string): Promise<boolean> {
  const res = await fetch(url, { method: 'HEAD' })
  return res.ok
}
```

If any picked track 404s:
- Mark that asset `status='failed'`
- Apply 80% threshold gate (same as AI lofi)
- If below threshold, video fails with `errorMessage='stock_track_unavailable'`, user prompted to re-pick

## Future provider hook

Same registry pattern as music providers. Add Freesound by:
1. New file `shared/lib/providers/audio-stock-freesound.ts`
2. Implement `StockAudioProvider` interface
3. Add to registry map
4. UI shows provider tab toggle

Not in MVP.
