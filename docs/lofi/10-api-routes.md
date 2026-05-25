# 10 — API Routes & Contracts

All routes live under `app/api/lofi/` except webhooks (under `app/api/webhooks/fal/`).

## Summary

| Method | Path | Purpose | Stage |
|--------|------|---------|-------|
| POST | /api/lofi/expand-prompts | gemini vibe → music+visual prompts | 1 |
| POST | /api/lofi/generate | charge credits, fan-out fal jobs | 2 |
| GET | /api/lofi/videos/[id] | status + asset progress | (poll) |
| POST | /api/lofi/videos/[id]/cancel | abort generation | (any) |
| POST | /api/lofi/videos/[id]/retry-render | re-run arrangement + render only | (failed) |
| DELETE | /api/lofi/videos/[id] | delete video + assets, cascade | (terminal) |
| POST | /api/webhooks/fal/music/[assetId] | per-asset music gen completion | 3 |
| POST | /api/webhooks/fal/visual/[assetId] | per-asset visual gen completion | 3 |
| POST | /api/webhooks/fal/lofi-render/[videoId] | final compose completion | 5 |

## /api/lofi/expand-prompts

### Request
```ts
{ vibe: string; musicLoopCount: number; visualMode: string; visualAssetCount: number }
```
### Response 200
```ts
{ musicPrompts: string[]; visualPrompts: string[]; suggestedTitle: string; suggestedAmbientBed: string | null }
```
### Errors
- 400 invalid input
- 502 gemini bad output after retry

## /api/lofi/generate

### Request
```ts
{
  vibe: string
  targetDurationSec: number     // 3600 | 5400 | 7200
  musicModel: string
  musicLoopCount: number
  musicPrompts: string[]        // length === musicLoopCount, user-edited
  ambientBed: 'rain'|'vinyl'|'fireplace'|'cafe'|null
  visualMode: 'single-image'|'multi-image'|'single-video'|'multi-video'
  visualModel: string
  visualAssets: Array<{ prompt: string; durationSec: number }>
  suggestedTitle: string
}
```

### Response 200
```ts
{ videoId: string; storyId: string; redirectTo: string /* `/lofi/story/${storyId}` */ }
```
### Errors
- 400 input validation (zod)
- 402 insufficient credits (response includes shortfall)
- 500 fan-out partial failure (some submits failed) — still returns videoId; UI shows partial

## /api/lofi/videos/[id]

### Auth
Owner-only (`session.userId === lofiVideos.userId`)

### Response 200
```ts
{
  id: string
  status: string
  vibe: string
  targetDurationSec: number
  finalVideoUrl: string | null
  errorMessage: string | null
  assets: Array<{
    id: string
    kind: 'music'|'visual'
    orderIndex: number
    status: string
    resultUrl: string | null
    retryCount: number
  }>
  progress: {
    musicReady: number; musicTotal: number
    visualReady: number; visualTotal: number
    overallPct: number
  }
}
```

Polled every 5s by LofiVideoView while non-terminal.

## /api/lofi/videos/[id]/cancel

### Request
empty body

### Response 200
```ts
{ status: 'aborted'; refundedCredits: number }
```
### Errors
- 409 already terminal (can't cancel)

## /api/lofi/videos/[id]/retry-render

For `failed` videos where the render step was the failure point.

### Response 200
```ts
{ status: 'rendering' }
```
### Errors
- 409 not in failed-render state (assets need retrying differently)
- 402 insufficient credits for re-render fee

## DELETE /api/lofi/videos/[id]

Deletes `lofiVideos` row (cascades to `lofiAssets`), deletes mirror `stories` row, deletes blob URLs (best-effort via Vercel Blob `del()`).

### Response 204

## Webhook contracts

All webhooks accept fal's standard payload:
```ts
{
  request_id: string
  status: 'OK' | 'ERROR' | 'IN_PROGRESS'
  output?: { /* model-specific */ }
  error?: string
}
```

### POST /api/webhooks/fal/music/[assetId]
1. Validate webhook signature (reuse `assertFalWebhookValid`)
2. Idempotency: skip if asset in terminal status
3. On OK: download `output.audio_url` to Vercel Blob, set asset.status='ready', asset.resultUrl
4. On ERROR: increment retryCount; if < MAX_RETRIES resubmit; else mark failed
5. Call `maybeAdvanceVideo(asset.videoId)`

### POST /api/webhooks/fal/visual/[assetId]
Same as music but downloads `output.image_url` or `output.video_url`.

### POST /api/webhooks/fal/lofi-render/[videoId]
1. Validate signature
2. On OK: download `output.video_url` to Vercel Blob → update lofiVideos.finalVideoUrl, status='complete', mirror to stories
3. On ERROR: mark status='failed', errorMessage, refund render credits
4. Call `settleCredits(videoId)` on success

## Rate limiting

Use existing `rateLimit` table pattern. Suggested caps:
- `/api/lofi/expand-prompts`: 10 / 5min / user
- `/api/lofi/generate`: 5 / hour / user (prevents accidental double-submit)

## Auth

All routes require valid session (reuse Better Auth middleware). Webhooks bypass session — validated via fal signature only.
