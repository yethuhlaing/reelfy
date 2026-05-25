# Lofi Pipeline — MVP

Automated 1-2 hour "lofi for sleep/study" video generation built on the existing stickman stack (Next.js 16, fal.ai, Drizzle/Postgres, Vercel Blob, Polar credits).

Scope: single-video MVP. Manual trigger, user downloads MP4. No batch, no YouTube auto-upload — those are post-MVP layers.

## Reading order

1. [00-overview.md](00-overview.md) — locked decisions and trade-off table
2. [01-data-model.md](01-data-model.md) — new DB tables
3. [02-providers-music.md](02-providers-music.md) — music model registry
4. [03-providers-visual.md](03-providers-visual.md) — 4 visual modes
5. [04-prompt-expander.md](04-prompt-expander.md) — gemini vibe → prompts
6. [05-arrangement-engine.md](05-arrangement-engine.md) — crossfade timeline JSON
7. [06-orchestration.md](06-orchestration.md) — 5-stage pipeline + fan-in gate
8. [07-pricing-credits.md](07-pricing-credits.md) — per-asset pricing
9. [08-failure-retry.md](08-failure-retry.md) — retry policy + threshold
10. [09-ui-form-view.md](09-ui-form-view.md) — LofiForm + LofiVideoView
11. [10-api-routes.md](10-api-routes.md) — route contracts
12. [11-de-risk-tests.md](11-de-risk-tests.md) — what to test first

## High-level flow

```
User vibe input
   ↓
Gemini prompt expander  →  Editable preview (N music + K visual prompts)
   ↓
Credit pre-auth  →  Stage 2 launch
   ↓
Parallel fan-out: N music jobs + K visual jobs (fal.ai)
   ↓
Per-asset webhooks → DB-locked fan-in gate (retry up to 3×, require ≥80% success)
   ↓
Arrangement engine: build JSON timeline (loop order, fades, visual switches)
   ↓
Render: fal-ai/ffmpeg-api single-shot compose call
   ↓
Render webhook → save final MP4 to Vercel Blob, mark complete
```
