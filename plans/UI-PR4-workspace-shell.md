# UI-PR4 — Workspace Shell (top action bar + button visibility rules)

Goal: Replace cluttered panel header with sticky top action bar. Encode button show/hide rules in derived state. Reserve slots for thumbnail drawer (UI-PR5) and details popover (UI-PR7).
Depends on: UI-PR1, UI-PR3.

## Why
- Current `panel-header` mashes tabs + Play All + Export + Animate All + thumbnail together. User said too many buttons + confusing show/hide.
- All actions need consistent location regardless of story state.
- Visibility rules currently scattered with ad-hoc `disabled` checks. Need single derivation function.
- Workspace becomes the focal surface — top bar must always-on-screen even when scrolling scene grid.

## Changes

### 1. Workspace page restructure
File: `app/[category]/story/[id]/page.tsx`

Layout sections (top to bottom):
1. `<WorkspaceTopBar />` (sticky)
2. Tabs row: Scenes | Script
3. Main content area: `<SceneGrid />` or `<ScriptView />`
4. `<VoiceoverBar />` (sticky bottom, workspace-only — handled in UI-PR10)

Remove from page:
- Inline panel header markup
- Inline Animate All button + IIFE in JSX
- Inline ThumbnailSlot (moves to drawer in UI-PR5; for now render hidden placeholder)

### 2. Top action bar
New file: `components/WorkspaceTopBar.tsx`

Layout:
- Left: story title (1 line truncate) + tagline (small, hide on narrow)
- Right action cluster (right-aligned, gap 8px):
  - `<PlayAllBtn />`
  - `<AnimateAllBtn />`
  - `<ExportBtn />`
  - `<ThumbnailToggleBtn />` (UI-PR5 wires drawer)
  - `<OverflowMenu />` (⋯) — Rename, Duplicate, Delete, Open dashboard
- During generation only:
  - `<StopGenerationBtn />` replaces some action buttons
  - `<DetailsToggleBtn />` opens stage popover (UI-PR7)
- "Sample (read-only)" pill shown when `storyId === 'sample'`. All action buttons disabled.

Sticky: `position: sticky; top: 0; z-index: 50`. Backdrop blur on scroll.

### 3. Action button visibility state
New file: `lib/workspace-state.ts`

Single pure function `deriveWorkspaceActions(storyData, isGenerating)`:
```ts
return {
  playAll: { visible: scenes.length > 0, disabled: nothingPlayable || playing },
  animateAll: {
    visible: !isGenerating && remainingToAnimate > 0,
    disabled: remainingToAnimate === 0,
    label: pending > 0 ? `Animating ${done}/${total}…` : `✦ Animate All (${remainingToAnimate})`
  },
  export: { visible: anyVideoReady, disabled: rendering },
  thumbnail: { visible: true, disabled: !storyData },
  stopGeneration: { visible: isGenerating },
  details: { visible: isGenerating },
}
```

Each top-bar button consults this derivation. No ad-hoc `&&` chains in JSX.

### 4. Animate All confirm popover
New file: `components/AnimateAllBtn.tsx`

- Renders button with `(N)` count.
- Click → inline popover anchored to button: "Animate N scenes? Runs in background." `[Cancel] [Start]`.
- On Start: closes popover, button switches to live state `Animating 3/8…` with thin ring progress (CSS).
- Click during run opens secondary popover: per-scene status list (mini rows: scene #, status icon, error tooltip) + `Stop all` button (calls cancel-all from PR6 backend).
- No cost numbers (per user decision).

### 5. Play All button
New file: `components/PlayAllBtn.tsx`

- Hooks into existing `playAll` from page.
- Hidden when 0 scenes.
- Disabled while playing.

### 6. Export button stub
New file: `components/ExportBtn.tsx`

- Hidden until ≥1 scene has `videoUrl`.
- Click → opens export modal (UI-PR9 fills). For now: opens stub modal saying "Export coming in UI-PR9" OR wraps the existing `ExportButton` component as fallback.

### 7. Stop generation button
New file: `components/StopGenerationBtn.tsx`

- Visible only when `isGenerating`.
- Click → fires existing AbortController + calls `/api/stories/[id]/cancel` (PR6 backend route).
- Confirms via inline popover for safety.

### 8. Overflow menu
New file: `components/OverflowMenu.tsx`

- ⋯ icon button → dropdown:
  - Rename (inline)
  - Duplicate
  - Delete (confirm popover)
  - Open in dashboard (navigates to `/dashboard`)

### 9. Tabs
- Keep existing Scenes | Script tabs but move below top bar in their own row.
- Style: underline-style tab, not boxed.

## Files added
- `components/WorkspaceTopBar.tsx`
- `components/PlayAllBtn.tsx`
- `components/AnimateAllBtn.tsx`
- `components/ExportBtn.tsx`
- `components/StopGenerationBtn.tsx`
- `components/OverflowMenu.tsx`
- `lib/workspace-state.ts`

## Files modified
- `app/[category]/story/[id]/page.tsx` (extract markup, use new components, lift handlers into props)
- `components/ExportButton.tsx` (deprecate or refactor into `ExportBtn.tsx`)
- `styles/globals.css` (sticky top-bar styles, ring progress for animate state)

## Verification
- Generate flow: top bar shows Stop generation + Details only.
- After generation: Play All / Thumbnail toggle visible. Animate All visible with `(N)` count where N = animatable scenes. Export hidden.
- Animate one scene to completion: Export appears.
- Animate All click → popover confirm → click Start → button morphs to `Animating x/N`. Click animating btn → per-scene status popover.
- Sample story id: all action buttons render disabled with tooltip "Read-only sample".
- No `Animate All` shown when nothing left to animate.
- Top bar stays sticky on scroll.
- Story title truncates on narrow viewport, tagline hidden < 768px.
