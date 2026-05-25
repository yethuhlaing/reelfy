# 03 — Data Model (Reuse + Additions)

Reuses `lofiVideos` and `lofiAssets` tables from [../lofi/01-data-model.md](../lofi/01-data-model.md). New columns added to support stock-source tracking. Category-driven row variant.

## Schema delta

### `lofiVideos` — no new columns
- `category` discriminator lives in mirror `stories.category` column (`'lofi'` vs `'lofi-stock'`)
- `musicModel` reused, set to `'pixabay'` for stock videos
- `musicLoopCount` reused, represents the number of picked stock tracks

### `lofiAssets` — new columns

```ts
// added to existing pgTable('lofi_assets', { ... })
sourceProvider: text('source_provider'),    // null | 'pixabay'
sourceTrackId:  text('source_track_id'),    // pixabay track id when sourceProvider is set
sourceLicence:  text('source_licence'),     // licence text snapshot at pick time
sourceAttribution: text('source_attribution'),  // attribution string (null for Pixabay)
```

All nullable — AI-lofi rows have these null.

### `lofiAssets.kind` extended

New value: `'stock-music'`.

```
'music'        → AI-generated music loop (AI lofi pipeline)
'stock-music'  → Pixabay-sourced music track (this pipeline)
'visual'       → AI-generated image or video clip (both pipelines)
```

## Row creation difference

For AI lofi music asset:
```ts
{
  videoId, kind: 'music', orderIndex, prompt, model: 'minimax',
  durationSec: 90, status: 'pending', falJobId: null,
  resultUrl: null, /* fills on webhook */
  sourceProvider: null,
  ...
}
```

For lofi-stock music asset:
```ts
{
  videoId, kind: 'stock-music', orderIndex,
  prompt: track.tags.join(','),    // store tags in prompt for searchability
  model: 'pixabay',                 // for cost log compatibility
  durationSec: track.durationSec,
  status: 'ready',                  // immediately ready — no fal job
  falJobId: null,
  resultUrl: track.downloadUrl,     // direct Pixabay CDN URL
  sourceProvider: 'pixabay',
  sourceTrackId: track.id,
  sourceLicence: track.licence,
  sourceAttribution: track.attribution,
  creditsCharged: 0,
  costUsd: '0',
}
```

## Migration

Single drizzle migration adds 4 nullable columns. Zero downtime — backfill not needed (existing AI lofi rows just stay null).

```sql
ALTER TABLE lofi_assets ADD COLUMN source_provider TEXT;
ALTER TABLE lofi_assets ADD COLUMN source_track_id TEXT;
ALTER TABLE lofi_assets ADD COLUMN source_licence TEXT;
ALTER TABLE lofi_assets ADD COLUMN source_attribution TEXT;
```

## Indexes

Optional (post-MVP):
- `lofi_assets (source_provider, source_track_id)` — find duplicate uses across user's videos (rare query)

## Stories mirror

Same as AI lofi but `category='lofi-stock'`:
```ts
{ id: storyId, userId, category: 'lofi-stock', status: 'draft', title, tagline, protagonist: '' }
```

Dashboard differentiates badges by category for visual cue ("Lofi" vs "Lofi-Stock"). Same card component.

## Cascade

`onDelete: 'cascade'` already on `lofiAssets.videoId → lofiVideos.id`. Stock-music rows get cleaned up when video is deleted. No external state to clean (we don't host the Pixabay audio — just reference URLs).

## Reporting / admin

Admin dashboard query: count of stock vs AI music assets:
```sql
SELECT
  CASE WHEN kind = 'stock-music' THEN 'stock' ELSE 'ai' END AS source,
  COUNT(*) AS asset_count,
  SUM(cost_usd) AS total_cost
FROM lofi_assets
WHERE kind IN ('music', 'stock-music')
GROUP BY 1;
```

Useful to verify cost-savings claim of the stock pipeline.
