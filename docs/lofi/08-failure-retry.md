# 08 — Failure & Retry Policy

## Per-asset retry

When a music or visual fal job webhook returns ERROR:

```
attempt 1 fails  → retryCount=1, resubmit with same prompt+model
attempt 2 fails  → retryCount=2, resubmit (5s backoff before submit)
attempt 3 fails  → retryCount=3, resubmit (15s backoff)
attempt 4 fails  → mark status='failed' permanently
```

Implemented in `retryAsset(asset)` helper inside [06-orchestration.md](06-orchestration.md). Backoff via simple `setTimeout` before submit OR a delayed-task primitive (Upstash redis `zadd` with score=timestamp) if cleaner — MVP can use inline setTimeout since orchestrator route is short-lived; the resubmit is also short.

Better: enqueue retry via deferred task. MVP shortcut acceptable.

## Threshold gate (80%)

After all assets reach a terminal state (`ready`, `failed`), compute:
```
successRate = countReady / countTotal
```

- `successRate >= 0.8` → proceed to arrangement, mark failed assets as `skipped` (they're still in DB for transparency, but excluded from arrangement plan)
- `successRate < 0.8` → mark `lofiVideos.status='failed'`, refund pre-auth minus successful asset cost

Threshold configurable via `appConfig.lofi_min_success_rate` (default `0.8`).

## Music-only vs visual-only threshold

Subtle case: if all 20 music loops succeed but the single visual image fails, success rate = 20/21 = 95% but the video has no visual. Need per-kind floors:

- `music` floor: ≥80% of music loops ready AND ≥minimum-loops-for-target (~10)
- `visual` floor: 100% of visuals ready (visuals are typically 1-12, can't tolerate gaps in `single-*` modes)

Implementation:
```ts
function evaluateGate(assets: Asset[]): GateResult {
  const music = assets.filter(a => a.kind === 'music')
  const visual = assets.filter(a => a.kind === 'visual')
  const musicReady = music.filter(a => a.status === 'ready')
  const visualReady = visual.filter(a => a.status === 'ready')

  if (visualReady.length < visual.length) return { proceed: false, reason: 'visual_incomplete' }
  if (musicReady.length / music.length < 0.8) return { proceed: false, reason: 'music_below_threshold' }
  if (musicReady.length < 10) return { proceed: false, reason: 'music_insufficient_count' }

  return { proceed: true }
}
```

## Render failure

Single fal compose call. No retry of the compose itself MVP — if it fails it's usually a filter graph bug, retry rarely helps.

- Mark `lofiVideos.status='failed'`, store `errorMessage`
- Refund render credits (5cr)
- Surface "Retry render" button in UI — re-builds arrangement plan + re-submits (assets reused). Useful if first attempt hit a transient fal infra issue.

## User cancellation

`POST /api/lofi/videos/[id]/cancel`

- Set `status='aborted'` atomically: `UPDATE ... WHERE status IN ('generating','rendering')`
- If status was 'generating': refund (pre-auth - already-ready asset credits)
- If status was 'rendering': refund render credits only
- Late webhooks check status='aborted' → no-op (don't download blobs, don't trigger arrangement)

## Idempotency

All webhooks check current asset status before acting:
- If `ready`/`skipped`/`failed` already and webhook tries to set same/different → ignore
- Prevents duplicate downloads and double-charging from fal webhook retries

## Observability

- Each stage transition logs with `videoId`, `userId`, prev status, new status
- Failures emit a row in existing usage events table for admin dashboard
- Per-asset retry counts visible in `lofiAssets.retryCount` for debugging

## What we don't retry MVP

- fal compose render: manual retry only (button)
- Gemini expand: 1 inline retry only ([04-prompt-expander.md](04-prompt-expander.md))
- Blob upload from fal URL: 1 inline retry, then mark asset failed

## Future hardening (post-MVP)

- Queue retries via Upstash redis instead of inline setTimeout (survives serverless cold starts)
- Per-model failure rate tracking to auto-deprioritize flaky models
- Adaptive threshold (lower for cheap models, stricter for premium)
