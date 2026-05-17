# UI-PR2 — Dashboard Page (cards + empty state + sample)

Goal: Build `/dashboard` as the primary landing surface — hero CTA, stats, story grid, empty-state with sample story. Replaces the left-panel "Recent stories" list from the single-page app.
Depends on: UI-PR1.

## Why
- Single-page recent list doesn't scale past a handful of stories.
- Dashboard = scannable overview before drilling into a story.
- Empty state must teach the workflow without coachmarks — sample story lets users see end-state before committing.

## Changes

### 1. Dashboard page
File: `app/dashboard/page.tsx`

Layout:
- `<DashboardHero />` row (top)
- `<StoryGrid />` below, scoped to active category from sidebar context
- `<EmptyDashboard />` rendered when no real stories exist

### 2. Hero
New file: `components/DashboardHero.tsx`

- Big "New Story" CTA card (left, ~40% width) → links `/[activeCategory]/new`
- Three small stat tiles right: `Stories: N`, `Credits used: —`, `Minutes generated: N`
- Stats derived from `listStories()` aggregation. Credits stays `—` until billing lands.

### 3. Story card
New file: `components/StoryCard.tsx`

Markup:
```
┌──────────────────────────┐
│   [thumb or fallback]    │  16:9
│  ⦿ Status                │  top-left pill
│              ⋯ menu      │  top-right (hover only)
├──────────────────────────┤
│ Title (1 line)           │
│ 12 scenes · 8 animated   │
│ Updated 2h ago           │
└──────────────────────────┘
```

Fallback thumb priority: `thumbnailUrl` → first `scene.imageUrl` → gradient + stick-figure SVG.

Status pill derivation:
- `Generating` if any active SSE / pending image events for this story (live ref via poller — out of scope here, hook stub)
- `Rendered` if exported video URL stored
- `Ready` if all scenes have images + voiceover
- `Draft` otherwise
- `Failed` if last attempt errored

Counts derived from `storyData.scenes`:
- total scenes
- `s.videoUrl` count → animated
- `s.voiceoverUrl` count → voiced

⋯ menu (hover-revealed):
- Rename (inline edit, saves to `updateStory`)
- Duplicate (clones record with new ID)
- Export (links into workspace export modal — UI-PR9 fills)
- Delete (calls existing `deleteStory`, confirms via inline popover)

Card click → `/[category]/story/[id]`. ⋯ click stops propagation.

### 4. Empty state
New file: `components/EmptyDashboard.tsx`

- Centered stick-figure SVG illustration (reuse `components/StickmanScribble.tsx` static frame when added in UI-PR7, or a local static SVG for now).
- "Create your first story" heading + sub.
- Primary CTA → `/stickman/new`.
- Below CTA: "Or explore a sample" — read-only sample card. Click → `/stickman/story/sample` (in-memory only).

### 5. Sample story
New file: `lib/sample-story.ts`

- Export hardcoded `StoryData` (title, tagline, 6 scenes with placeholder image URLs from `public/`, voiceover text, no real audio).
- Workspace page checks `id === 'sample'` → loads from this file, disables all generate/animate/export buttons (read-only badge in top-bar).
- Sample disappears from dashboard empty state once `listStories().length > 0`.

### 6. Storage extensions
File: [lib/storage.ts](lib/storage.ts)

Add helpers/fields:
- `getStorySummary(id)` returns `{ status, sceneCount, animatedCount, voicedCount, updatedAt }` derived from stored data
- `renameStory(id, title)`
- `duplicateStory(id): string` returns new ID

`StoredStorySummary` extended with `category`, `status`, `lastUpdated`.

## Files added
- `components/DashboardHero.tsx`
- `components/StoryCard.tsx`
- `components/EmptyDashboard.tsx`
- `lib/sample-story.ts`
- `public/illustrations/empty-dashboard.svg` (or inline SVG)

## Files modified
- `app/dashboard/page.tsx`
- `lib/storage.ts` (rename, duplicate, summary derivation, status field)
- `app/[category]/story/[id]/page.tsx` (sample-id read-only branch)

## Verification
- Fresh user: dashboard shows empty illustration + CTA + clickable sample card.
- After first save: sample disappears, story grid renders the card with correct status pill.
- Card status pill matches state (manually create draft, partial, fully animated, export — verify pill text/color).
- Rename inline saves and persists across reload.
- Duplicate creates new card with `(copy)` suffix, original untouched.
- Delete prompts and removes from grid.
- Switching category in sidebar re-scopes grid (initially only stickman shows entries; others empty).
- Sample workspace loads but Generate/Animate/Export all disabled with "Sample (read-only)" pill.
