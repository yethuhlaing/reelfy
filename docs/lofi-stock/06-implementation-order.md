# 06 — Implementation Order

Assumes AI lofi pipeline (PRs 1-10 from [../lofi/12-implementation-order.md](../lofi/12-implementation-order.md)) is already merged. If not, build that first — lofi-stock layers on top.

## Pre-work

- **PR S0:** Pixabay API key acquired, tested manually with curl, sample response saved to `docs/lofi-stock/pixabay-sample.json` (gitignored or anonymized). Confirm licence text + endpoints match what code assumes.

## Core PRs (in order)

### PR S1 — Schema migration
- Add 4 columns to `lofi_assets`: `source_provider`, `source_track_id`, `source_licence`, `source_attribution`
- Drizzle migration script
- Existing AI lofi rows unaffected (all new columns nullable)
- Tests: migration up/down, existing data preserved

### PR S2 — Pixabay provider + search route
- `shared/lib/providers/audio-stock.ts` — interface + Pixabay implementation
- `GET /api/lofi-stock/search` with Upstash redis caching (1h TTL)
- Server-side only, API key not exposed
- Rate limit: 30 searches/min/user via existing `rateLimit` table
- Tests: mocked Pixabay responses, cache hit/miss, rate limit trigger

### PR S3 — Orchestrator branch
- Modify `features/lofi/server/lofi-orchestrator.ts` to handle `category='lofi-stock'`
- New helper `buildStockMusicRow()` creates `kind='stock-music'`, `status='ready'` rows
- Skip fal submit for stock-music kind
- URL HEAD validation step before render submit
- Arrangement engine `pickRepeats(loopLenSec)` helper for stock track repeat logic
- Tests: launch with mixed asset types, validate URL filter, gate behavior

### PR S4 — Generate route
- `POST /api/lofi-stock/generate`
- Accepts `selectedTracks[]` instead of `musicPrompts[]`
- Calls into shared `launchVideo()` with `category='lofi-stock'`
- Visual prompt expansion via existing `/api/lofi/expand-prompts` (only `visualPrompts` returned used)
- Tests: input validation, credit pre-auth amount (visual + render only)

### PR S5 — LofiStockForm
- `features/lofi-stock/components/LofiStockForm.tsx` (top-level)
- `StockTrackSearch.tsx` (search bar + grid)
- `StockTrackCard.tsx` (card with play + add)
- `SelectedTracksDrawer.tsx` (selection footer)
- `StockTrackPlayer.tsx` (audio element ref-counted)
- Cost preview reused from AI lofi component (variant for 0-cost music)
- Tests: search interaction, multi-pick, duration math, validation gate

### PR S6 — Route picker update
- `app/[category]/new/page.tsx` — handle `'lofi-stock'` → `<LofiStockForm />`
- `app/[category]/story/[id]/page.tsx` — handle `'lofi-stock'` → existing `<LofiVideoView />` (works as-is)
- Sidebar / "Create" menu adds "Lofi (Free)" entry pointing to `/lofi-stock/new`
- Tests: e2e click from sidebar to form

### PR S7 — Licence display + polish
- Track card tooltip shows licence summary
- LofiVideoView shows per-video licence summary after complete
- Toast / banner: "Music sourced from Pixabay — free for commercial use"
- Admin dashboard tile: stock vs AI music asset counts
- E2E test: full happy-path stock video creation in test env

## Estimated effort

| PR | Days |
|----|------|
| S0 (Pixabay verify) | 0.5 |
| S1 | 0.5 |
| S2 | 1 |
| S3 | 1 |
| S4 | 0.5 |
| S5 | 1.5 |
| S6 | 0.5 |
| S7 | 0.5 |
| **Total** | **~6 days** |

## Dependency graph

```
S0 ─── S1 ───┬─── S2 ───┐
             └─── S3 ────┴── S4 ─── S5 ─── S6 ─── S7
```

S2 and S3 are parallelizable after S1.

## Bundled-in improvements applied to AI lofi

PR S3 introduces `pickRepeats(loopLenSec)` to arrangement engine. AI lofi already uses 2-3× repeat — replace its hardcoded logic with this helper. Improvement applies to both pipelines without behavioral change for AI side (since 90s loops still pick 3 repeats).

## Out of scope for this set of PRs

- Mixed stock + AI music in same video (would need orchestrator changes)
- Second stock provider (Freesound, Jamendo) — architecture supports it, implementation post-MVP
- In-video Pixabay credit overlay — design done, not built
- YouTube auto-upload — separate epic
- Cron-driven batch generation — separate epic

## Definition of done

- User can land at `/lofi-stock/new`, search "lofi rain", play previews, pick 18 tracks totaling 60+ minutes
- Submit generates an `<6 credit` 1hr MP4 with their visual prompt + selected music
- Video plays in dashboard, downloads as MP4
- Failed Pixabay track → graceful gate fallback or clear error message
- Admin dashboard shows the cost-saving in stock vs AI tally
