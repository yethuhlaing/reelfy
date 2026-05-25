# 12 — Implementation Order

Suggested PR-sized chunks. Each chunk should be independently shippable + revertible.

## Pre-work

- **PR 0:** Run [11-de-risk-tests.md](11-de-risk-tests.md) tests 1-3. Record results. Adjust plan docs if anything fails.

## Core PRs

### PR 1 — DB schema + provider scaffolding
- Add `lofiVideos`, `lofiAssets` tables + drizzle migration
- Add `shared/lib/providers/music.ts` registry skeleton + 3 model adapters (stubbed `submit()` calls)
- No UI, no routes yet
- Tests: schema migration roundtrip, provider registry returns correct adapter

### PR 2 — Prompt expander API
- `POST /api/lofi/expand-prompts`
- gemini wrapper at `features/lofi/server/prompt-expander.ts`
- zod validation, fallback retry on bad JSON
- Tests: mock gemini, validate output shape

### PR 3 — Generate route + fan-out orchestrator
- `POST /api/lofi/generate`
- `features/lofi/server/lofi-orchestrator.ts` (fan-out + cost calc)
- credit pre-auth integration
- creates `stories` mirror row
- Tests: integration test with fal submit stubbed

### PR 4 — Asset webhooks + fan-in gate
- `POST /api/webhooks/fal/music/[assetId]`
- `POST /api/webhooks/fal/visual/[assetId]`
- `maybeAdvanceVideo()` with atomic claim
- retry logic (3× with backoff)
- 80% threshold gate
- Tests: simulate webhook sequences (all success, partial fail, race condition)

### PR 5 — Arrangement engine + render submit
- `features/lofi/server/arrangement.ts` — plan builder + filter graph compiler
- triggered from PR 4's `maybeAdvanceVideo`
- submits to `fal-ai/ffmpeg-api/compose`
- Tests: snapshot the filter_complex output for a fixed seed

### PR 6 — Render webhook + finalize
- `POST /api/webhooks/fal/lofi-render/[videoId]`
- blob upload, status flip to complete
- credit settlement + refund logic
- Tests: happy path, render-fail path

### PR 7 — LofiForm UI
- form with vibe + duration + model picker + visual mode
- live cost preview
- POST to expand-prompts, edit list, POST to generate
- Tests: form validation, cost calc

### PR 8 — LofiVideoView + status polling
- viewer at `/lofi/story/[id]`
- 5s polling of `GET /api/lofi/videos/[id]`
- status-driven render (progress / player / error)
- cancel + retry buttons
- Tests: visual snapshot per status

### PR 9 — Route picker + dashboard integration
- `app/[category]/new/page.tsx` switch
- `app/[category]/story/[id]/page.tsx` switch
- Dashboard category badge for `lofi`
- Tests: e2e click-through

### PR 10 — Polish + cost logging
- `apiCostLogs` rows for music/visual/render
- admin dashboard sees lofi spend
- error toasts, loading states
- E2E test: full happy-path video creation in test env (with fal stubbed)

## Estimated effort

| PR | Days |
|----|------|
| 0 (de-risk) | 1-2 |
| 1 | 0.5 |
| 2 | 0.5 |
| 3 | 1 |
| 4 | 2 |
| 5 | 2 |
| 6 | 1 |
| 7 | 2 |
| 8 | 1.5 |
| 9 | 0.5 |
| 10 | 1 |
| **Total** | **~13 days** |

## Parallelizable chunks

- PR 2 (prompts) and PR 5 (arrangement) can be built before PR 4 is done — both have no runtime dependency on the orchestrator's webhook layer
- PR 7 (form) can start once PR 1 schema is merged — uses API contracts from [10-api-routes.md](10-api-routes.md) as a stub
- PR 8 (viewer) can be mocked against fixture data until PR 6 lands

## Dependency graph
```
PR0 ─── PR1 ─┬── PR2 ─── PR3 ─── PR4 ─── PR5 ─── PR6 ─── PR10
             │                                    
             ├── PR7 ─── PR9                      
             │                                    
             └── PR8 ─── PR9                      
```
