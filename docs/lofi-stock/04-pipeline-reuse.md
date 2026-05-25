# 04 — Pipeline Reuse vs Differences

Lofi-stock reuses ~80% of the AI lofi pipeline. This doc maps what's shared, what's new, what's modified.

## Reuse map

| Component | AI lofi | Lofi-stock | Notes |
|-----------|---------|------------|-------|
| DB schema | `lofiVideos`, `lofiAssets` | same + 4 new columns | [03-data-model.md](03-data-model.md) |
| Stories mirror | yes | yes (different category) | unified dashboard |
| Music providers | `shared/lib/providers/music.ts` registry | NOT used | stock pipeline skips music gen entirely |
| Stock provider | n/a | `shared/lib/providers/audio-stock.ts` | new |
| Visual providers | reuse stickman | reuse stickman | identical |
| Prompt expander | `features/lofi/server/prompt-expander.ts` | reuse | only `visualPrompts` portion used |
| Orchestrator | `features/lofi/server/lofi-orchestrator.ts` | extend | branch on `category` for music-stage skip |
| Arrangement engine | `features/lofi/server/arrangement.ts` | reuse unchanged | operates on URLs; doesn't care about source |
| Render webhook | `app/api/webhooks/fal/lofi-render/[videoId]` | reuse unchanged | |
| Asset webhook (visual) | `app/api/webhooks/fal/visual/[assetId]` | reuse unchanged | |
| Asset webhook (music) | `app/api/webhooks/fal/music/[assetId]` | not invoked | stock tracks never call this |
| Credit system | per-asset + pre-auth + settle | same | stock-music rows = 0 cr |
| Cancel flow | `POST /api/lofi/videos/[id]/cancel` | reuse | works on any lofi video by ID |
| LofiForm | `features/lofi/components/LofiForm.tsx` | not used | stock has its own form |
| LofiVideoView | `features/lofi/components/LofiVideoView.tsx` | reuse | status display works for any source |

## Pipeline stages — stock variant

```
1. Plan      — vibe + duration + visual config + track browse-and-pick
2. Fan-out   — pre-auth credits, create asset rows
              — visual fal jobs submitted in parallel
              — stock-music rows inserted with status='ready' immediately
3. Gate      — webhooks update visual assets only
              — when last visual ready → maybeAdvanceVideo() (same logic)
              — gate evaluates: all visuals ready AND all stock-music URLs validated
4. Arrange   — runArrangementAndRender(videoId) (same code path)
5. Finalize  — render webhook → finalUrl + settle (same code path)
```

Key difference: at stage 2, music assets are born `ready` so they're already counted in the gate's "ready" tally. Gate proceeds as soon as visuals finish.

## Code branch points

### `lofi-orchestrator.ts.launchVideo()`

```ts
async function launchVideo(input, userId) {
  // ...credit + insert video row...

  // Build asset rows differently based on category:
  const musicAssetRows = input.category === 'lofi-stock'
    ? input.selectedTracks.map((t, i) => buildStockMusicRow(videoId, t, i))
    : input.musicPrompts.map((p, i) => buildAiMusicRow(videoId, p, input.musicModel, i))

  const visualAssetRows = buildVisualRows(videoId, input)

  await db.insert(lofiAssets).values([...musicAssetRows, ...visualAssetRows])

  // Submit only what needs submission (skip stock-music)
  const submittable = [...musicAssetRows, ...visualAssetRows].filter(a => a.kind !== 'stock-music')
  await Promise.all(submittable.map(submitAssetJob))

  // If all visuals + stock-music are already ready (edge: visual=0?), advance now
  await maybeAdvanceVideo(videoId)
}
```

### URL validation for stock tracks

Best place: in `maybeAdvanceVideo()`, right before flipping status to `rendering`:

```ts
const stockUrls = readyAssets.filter(a => a.kind === 'stock-music').map(a => a.resultUrl!)
const invalid = await Promise.all(stockUrls.map(async url => ({ url, ok: await headOk(url) })))
const failed = invalid.filter(x => !x.ok)
if (failed.length > 0) {
  // Mark affected assets failed, re-evaluate threshold gate
  await markAssetsFailedByUrl(videoId, failed.map(f => f.url))
  return maybeAdvanceVideo(videoId) // recursive re-eval
}
```

## Arrangement engine — zero changes

`buildArrangementPlan(video, readyAssets)` already operates on URLs. Music block generation looks at `asset.resultUrl` and `asset.durationSec`. Doesn't care if source is fal.ai or Pixabay.

One subtle adjustment: AI loops are 90s, played 2-3× with crossfade. Stock tracks are 2-4min, played 1× (already long enough). Add per-asset metadata or infer from duration:

```ts
function pickRepeats(loopLenSec: number): number {
  if (loopLenSec < 60) return 4
  if (loopLenSec < 120) return 3
  if (loopLenSec < 180) return 2
  return 1   // stock tracks ≥3min, no repeat
}
```

This change goes in AI lofi's `arrangement.ts` too — improvement for both.

## Routes

All new under `app/api/lofi-stock/`:

| Route | Purpose |
|-------|---------|
| `GET /api/lofi-stock/search` | Pixabay search proxy |
| `POST /api/lofi-stock/generate` | Generate launch (stock variant of `/api/lofi/generate`) |

Note: `GET /api/lofi/videos/[id]`, cancel, retry-render endpoints reused as-is. They return data for both `lofi` and `lofi-stock` videos.

## URL routing

| URL | Component |
|-----|-----------|
| `/lofi/new` | `<LofiForm />` |
| `/lofi-stock/new` | `<LofiStockForm />` |
| `/lofi/story/[id]` | `<LofiVideoView />` |
| `/lofi-stock/story/[id]` | `<LofiVideoView />` (same component, category-driven badge) |

Page dispatch in `app/[category]/new/page.tsx`:
```ts
const FORM = { lofi: LofiForm, 'lofi-stock': LofiStockForm }[category] ?? StoryForm
return <FORM />
```

## Failure modes specific to stock

| Failure | Handling |
|---------|----------|
| Pixabay search 429 | Return 503 + Retry-After; UI shows toast |
| Picked track URL 404 at render | Mark asset failed; 80% gate decides proceed/fail |
| Pixabay API key invalid | All searches 500; admin dashboard alert |
| Track removed between pick and render | Same as 404 case |
