# UI-PR7 — Generation Loading UX (scribble + gibberish + skeleton stream + collapsed stages)

Goal: Replace plain "Planning with Gemini" sidebar text with branded loading — animated stick-figure scribble + cycling gibberish text + streaming skeleton scene cards. Stage list collapsed behind "Details" popover with per-stage cancel.
Depends on: UI-PR4.

## Why
- Existing `StageList` is a dry status log — user wants engaging loading animation.
- Stages are leaky implementation detail; only power users need to see them.
- Skeleton scene cards stream in as `scene-planned` events arrive → user sees structure immediately, not a wall of nothing.
- PR6 backend adds per-stage cancel; UI surface for that lives here.

## Changes

### 1. Stickman scribble component
New file: `components/StickmanScribble.tsx`

- Inline SVG with stroke-dasharray + stroke-dashoffset animation (CSS keyframes).
- Loops: stick figure body lines draw → fade → redraw, ~2.5s cycle.
- Variants: `large` (center loading), `small` (header indicator).
- Pure CSS animation, no JS — performant.

### 2. Gibberish text cycler
New file: `components/GibberishText.tsx`

- Picks a random phrase from `gibberish-pool.ts` every 800ms.
- Smooth fade transition between phrases (200ms opacity).
- Pauses when document hidden (uses `visibilitychange`).

### 3. Phrase pool
New file: `lib/gibberish-pool.ts`

Stickman-category neutral pool (~30 entries):
```ts
export const STICKMAN_GIBBERISH = [
  "stick figure steps forward...",
  "scene unfolds frame by frame...",
  "ink hits paper...",
  "tracing the next moment...",
  "lines find their shape...",
  // ...
]
```

Export per-category later. For now only stickman.

### 4. Loading center area
File: `app/[category]/story/[id]/page.tsx`

When `isGenerating === true`:
- Above the scene grid (or replacing the empty-state region): center column with:
  - `<StickmanScribble variant="large" />`
  - `<GibberishText pool={STICKMAN_GIBBERISH} />`
  - Compact stage indicator line: "Planning scenes • 4/12 images" — derived 1-line summary from current stage state. NOT the full StageList.
  - Skeleton cards stream below as `scene-planned` events fire (replace existing scene list).
- When `images` stage status moves to `complete`: scribble collapses to small header indicator + skeletons replaced with real images (already wired via existing events).

### 5. Stage details popover
New file: `components/StageDetailsPopover.tsx`

Triggered by top-bar `Details ▾` button (visible only during generation, per UI-PR4).
Popover contents:
- Full `<StageList />` (existing component, refactored for popover)
- Per-stage row: status icon + label + detail text + Cancel button (only when status === 'active' AND PR6 backend supports stage-level cancel)
- Image progress bar `4/12`

Closed by default. Click-outside dismisses.

### 6. StageList refactor
File: `components/StageList.tsx`

- Compact mode: pure list rendering, no own framing (parent popover provides chrome).
- Add `onCancel?: (stageId: StageId) => void` prop. Show small `Cancel` button on active rows when prop provided.
- Keep image-progress sub-row.

### 7. Top-bar wiring (Stop generation + Details)
File: `components/WorkspaceTopBar.tsx` (from UI-PR4)

- `<DetailsToggleBtn />`: opens StageDetailsPopover, badge if any stage errored.
- `<StopGenerationBtn />`: existing wiring. Calls `cancelGenerate()` from context, hits `/api/stories/[id]/cancel`.

### 8. Skeleton stream
- `SceneGrid` already mixes skeletons (UI-PR6). During generation, grid renders one skeleton per planned scene as `scene-planned` events come in.
- Image arrival flips skeleton → image card (existing `scene-image` event handler).

### 9. Generation kickoff from workspace
File: `app/[category]/story/[id]/page.tsx`

Per Pattern B from UI-PR3:
- On mount, if URL has `?starting=1` AND a pending record exists for this story ID:
  - Fire `POST /api/generate` with stored prompt + options
  - Read SSE, dispatch events (existing logic moves here verbatim)
  - On first SSE event: drop `?starting=1` from URL via `router.replace` (avoids re-fire on refresh)
  - On completion: clean up pending record + save final story
- Otherwise: just render existing story.

### 10. Per-stage cancel hook
- Backend PR6 already specifies cancel surface in StageList. This PR wires the UI button to the `/api/stories/[id]/cancel` endpoint (whole-story cancel for now — PR6 does not split per-stage on backend).
- `Cancel` per stage row → calls full story cancel (treat as same action — abort SSE).

### 11. Brand-neutral copy nuance
- User decision: keep founder prompt for stickman category (Q3).
- Gibberish pool is generic and not founder-specific — works for any prompt. Good as-is.
- StageList labels stay current ("Analyze story", "Plan scenes", "Generate images").

## Files added
- `components/StickmanScribble.tsx`
- `components/GibberishText.tsx`
- `components/StageDetailsPopover.tsx`
- `components/SkeletonSceneCard.tsx` (also referenced by UI-PR6 — whichever PR lands first creates it)
- `lib/gibberish-pool.ts`

## Files modified
- `app/[category]/story/[id]/page.tsx` (loading area, SSE kickoff from ?starting=1)
- `components/StageList.tsx` (cancel prop, compact mode)
- `components/WorkspaceTopBar.tsx` (Details + Stop wiring)
- `styles/globals.css` (scribble keyframes, gibberish fade, compact stage indicator)

## Verification
- Submit story → workspace loads with center scribble + gibberish + 1-line stage indicator.
- Stage list NOT visible in main area.
- Click `Details ▾` → popover with full stage list + per-stage cancel + image progress.
- As `scene-planned` events stream → skeleton cards appear below scribble.
- As `scene-image` events stream → skeletons flip to real images one-by-one.
- After images stage completes → scribble shrinks/disappears, full scene grid visible.
- Click Stop generation → SSE aborts, scribble disappears, stages show "cancelled".
- Reload mid-generation: URL `?starting=1` already consumed → no double-fire.
- Gibberish text cycles every ~800ms with fade.
- `prefers-reduced-motion` users: scribble draws statically, no looping animation.
