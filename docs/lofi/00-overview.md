# 00 — Overview & Locked Decisions

## Goals
- Generate 1-2 hour lofi videos end-to-end on user trigger
- Reuse existing stickman primitives: fal.ai providers, credits, Vercel Blob, webhook pattern, stories table for unified dashboard
- Single-video MVP — no batch, no YouTube upload, no multi-channel

## Non-goals (MVP)
- 4-5+ hour videos (target capped at 2hr to stay inside fal-ai/ffmpeg-api comfort zone)
- Auto-upload to YouTube (later layer)
- Channel rotation / variation matrix (later layer)
- Stem-level mixing (fal models don't reliably split stems)

## Locked decisions

| # | Branch | Decision |
|---|--------|----------|
| 1 | Scope | MVP single video, manual trigger, download MP4 |
| 2 | Music source | Loop library + arrangement, not gen-per-segment |
| 3 | Music models | Multi-model pool, user-picker: minimax + stable-audio + cassetteai + royalty-free ambient bed |
| 4 | Arrangement | Crossfade chain (8-16s xfade) + ambient bed layer, executed via `fal-ai/ffmpeg-api` |
| 5 | Visual modes | 4 user-selectable: `single-image`, `multi-image`, `single-video`, `multi-video`. Image/video models reuse existing stickman registries |
| 6 | Visual switch timing | User-defined `durationSec` per clip |
| 7 | Prompt gen | Vibe input → gemini expand → editable list → user confirm → batch submit |
| 8 | Data model | New `lofiVideos` + `lofiAssets` tables. Mirror row in `stories` (`category='lofi'`) for unified dashboard |
| 9 | Pipeline | 5 stages: plan → asset fan-out → DB-locked fan-in gate → arrangement → render → finalize |
| 10 | Render | Single-shot fal ffmpeg-api (chunked fallback documented but not built MVP) |
| 11 | Pool defaults | 20/30/40 loops for 1/1.5/2hr, user override |
| 12 | Pricing | Per-asset, preview before charge, atomic deduct at fan-out |
| 13 | UI | New `LofiForm` + `LofiVideoView` under `features/lofi/`. Route picker in `/[category]/new` |
| 14 | Failures | 3-retry per job + 80% success threshold. Pre-auth credits, settle on fan-in |

## Cross-cutting risks

- **fal-ai/ffmpeg-api filter_complex size at 30+ inputs** — test before building UI ([11-de-risk-tests.md](11-de-risk-tests.md))
- **Loop seam quality** — crossfade duration needs tuning per model
- **Credit refund accounting** — partial-success videos need precise settle logic ([07-pricing-credits.md](07-pricing-credits.md))
- **Webhook race at fan-in** — solved by atomic `UPDATE ... WHERE status='generating' RETURNING id`

## Estimated MVP build size
- ~5 new API routes
- 2 new tables
- 4 new provider files (music registry + 3 model adapters)
- 2 new feature components (Form + Viewer)
- 2 new server modules (orchestrator, arrangement)
- 2 new webhook handlers (asset, render)
