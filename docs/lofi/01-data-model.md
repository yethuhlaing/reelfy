# 01 — Data Model

Two new tables added to [shared/lib/db/schema.ts](../../shared/lib/db/schema.ts). A mirror row is also written to the existing `stories` table so the unified dashboard at `/dashboard` lists lofi videos alongside stickman stories.

## Why new tables (not reuse `scenes`)

`scenes` semantics = one frame of a stickman story (image + voiceover + motion). Lofi units don't map cleanly: music loops have no image, visual assets have no voiceover. Stretching `scenes` would mean nullable everything and category-aware queries everywhere. Cleaner to add purpose-built tables.

## `lofiVideos`

Top-level row per generated lofi video. Owned by `userId`. Links back to a `stories.id` for unified dashboard joins.

```ts
export const lofiVideos = pgTable('lofi_videos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  storyId: text('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),

  // user inputs
  vibe: text('vibe').notNull(),                       // raw vibe string
  targetDurationSec: integer('target_duration_sec').notNull(),  // 3600 / 5400 / 7200
  musicModel: text('music_model').notNull(),          // e.g. 'minimax', 'stable-audio'
  musicLoopCount: integer('music_loop_count').notNull(),
  visualMode: text('visual_mode').notNull(),          // 'single-image' | 'multi-image' | 'single-video' | 'multi-video'
  imageModel: text('image_model'),                    // null if visualMode is video-based
  videoModel: text('video_model'),                    // null if visualMode is image-based
  ambientBed: text('ambient_bed'),                    // 'rain' | 'vinyl' | 'fireplace' | null

  // pipeline state
  status: text('status').notNull().default('planning'),
  // planning | generating | gating | rendering | complete | failed | aborted

  // results
  arrangementJson: text('arrangement_json'),          // JSON: timeline plan
  finalVideoUrl: text('final_video_url'),             // Vercel Blob URL
  finalDurationSec: integer('final_duration_sec'),

  // accounting
  creditsPreAuth: integer('credits_pre_auth').notNull().default(0),
  creditsSettled: integer('credits_settled').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),

  createdAt,
  updatedAt,
})
```

## `lofiAssets`

One row per generated asset (music loop OR visual). Many rows per `lofiVideos`. Each has its own fal job ID for webhook routing.

```ts
export const lofiAssets = pgTable('lofi_assets', {
  id: text('id').primaryKey(),
  videoId: text('video_id').notNull().references(() => lofiVideos.id, { onDelete: 'cascade' }),

  kind: text('kind').notNull(),                       // 'music' | 'visual'
  orderIndex: integer('order_index').notNull(),
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),                     // resolved model id
  durationSec: integer('duration_sec').notNull(),     // requested length (gen target OR display time)

  // fal lifecycle
  falJobId: text('fal_job_id'),
  status: text('status').notNull().default('pending'),
  // pending | submitted | ready | failed | skipped
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),

  // result
  resultUrl: text('result_url'),                      // mp3 for music, png/mp4 for visual

  // accounting
  creditsCharged: integer('credits_charged').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),

  createdAt,
})
```

## Indexes
- `lofi_assets (video_id, status)` — fan-in gate query (count of not-ready siblings)
- `lofi_assets (fal_job_id)` — webhook lookup
- `lofi_videos (user_id, status)` — dashboard listing
- `lofi_videos (story_id)` — join into stories

## Status state machines

### `lofiVideos.status`
```
planning  → generating  → gating → rendering → complete
                  ↓                    ↓
                failed               failed
                  ↓
               aborted (user cancel)
```

### `lofiAssets.status`
```
pending → submitted → ready
                   ↘ failed → (retry) submitted → ready / failed / skipped
```

`skipped` = job failed but video proceeded (80% threshold reached).

## Stories mirror row

When user submits, also write:
```ts
{
  id: storyId,
  userId,
  title: <derived from vibe>,
  tagline: vibe.slice(0, 120),
  protagonist: '',
  category: 'lofi',
  status: 'draft',     // tracks lofiVideos.status mirror
  composedVideoUrl: null,  // populated on complete
}
```
On `lofiVideos.status='complete'`, copy `finalVideoUrl → stories.composedVideoUrl`. Dashboard then renders lofi card via existing story card path.
