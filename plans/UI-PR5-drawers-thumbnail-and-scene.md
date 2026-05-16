# UI-PR5 — Thumbnail Drawer + Scene Detail Drawer

Goal: Move thumbnail UI out of full-screen overlap into a top-right collapsible drawer. Add scene-detail right slide-over for inspect/edit. Build a shared Drawer primitive.
Depends on: UI-PR4.

## Why
- Current `ThumbnailSlot` takes huge inline area on the workspace right panel and (per user) overlaps the scene grid visually.
- No place to edit motion prompts or trigger regen per-scene currently.
- A reusable Drawer primitive supports both surfaces + future drawers (history, comments, etc.).

## Changes

### 1. Drawer primitive
New file: `components/Drawer.tsx`

Generic right-side slide-over. Props:
```ts
{ open: boolean; onClose: () => void; title?: string; widthClass?: string; children: ReactNode; placement?: 'right' | 'top-right' }
```

- `placement='right'`: full-height right slide-over (used for SceneDrawer).
- `placement='top-right'`: floats top-right, anchored under top-bar, ~360px wide, max-height 80vh (used for ThumbnailDrawer).
- Backdrop only for `placement='right'`. `top-right` is floating panel without backdrop (user keeps interacting with grid behind it).
- ESC key closes. Outside click closes (only when backdrop present).
- Focus trap when full-height.

### 2. Thumbnail drawer
New file: `components/ThumbnailDrawer.tsx`

Trigger: `<ThumbnailToggleBtn />` in top-bar (UI-PR4).
Contents:
- Header: "Thumbnail" + close X
- Prompt preview (read-only multiline)
- Generate / Regenerate button (uses existing thumbnail endpoint)
- Image preview (when generated). Click → opens full-size lightbox.
- "Copy prompt" small action

Does NOT cover scene grid. Floats top-right.

Behavior:
- Open state persisted in URL `?thumb=1` so refresh keeps drawer open mid-edit.
- Generation in progress: button shows spinner, prompt section disabled.

Wires into existing `handleThumbnailGenerated(url)` handler from workspace page.

### 3. Scene drawer
New file: `components/SceneDrawer.tsx`

Trigger: scene card click (UI-PR6 wires).
Contents:
- Header: scene number + title + close X
- Media: full image OR video (auto-detect by `scene.videoUrl`). Aspect-ratio preserved.
- Voiceover text block (editable in-place; saves to `updateStoryScene` on blur).
- Motion prompt textarea (editable; save button).
- Action row:
  - `▶ Play` (single-scene voiceover playback)
  - `↻ Regen image` (calls scene image regen endpoint — stub if not yet impl'd)
  - `↻ Regen voice` (re-fetches via /api/voiceover, overwrites stored URL)
  - `✦ Animate` / `⏸ Cancel` / `↻ Retry` depending on state
- Error block at bottom showing `scene.lastError` if present.

Right slide-over with backdrop. Width 480px on desktop, full-screen on mobile.

Audio: single shared `audioRef` from workspace context. Drawer play btn drives same audio that bottom VoiceoverBar reflects. Prevents double-audio.

### 4. Scene regen image API stub
New file: `app/api/scene/regen-image/route.ts`

POST `{ storyId, sceneId }` → re-runs image provider for that scene using stored prompt + options. Returns new URL. Updates blob path.

(Backend impl scope but small. If reluctant: leave as TODO stub returning 501, wire UI button to disable with tooltip "Coming soon".)

### 5. Workspace context for shared state
New file: `lib/workspace-context.tsx`

React context exposing:
- `storyData`, `setStoryData`
- `storyId`
- `audioRef`, `playState`, `setPlayState`
- `patchScene(sceneId, patch)`
- `options`

Workspace page wraps children with provider. Drawers + cards + bottom bar consume via hook `useWorkspace()`. Removes prop-drilling from existing top-level page.

### 6. Top-bar wiring
File: `components/WorkspaceTopBar.tsx` (from UI-PR4)

- Connect `<ThumbnailToggleBtn />` to drawer open state (URL `?thumb=1`).
- Icon: 🖼 + small dot indicator if thumbnail exists.

### 7. Remove old ThumbnailSlot from page
File: `app/[category]/story/[id]/page.tsx`

- Delete inline `<ThumbnailSlot />` render.
- Delete from old `panel-header`.
- Old `ThumbnailSlot.tsx` can stay as a sub-component used by `ThumbnailDrawer.tsx`, or be inlined.

## Files added
- `components/Drawer.tsx`
- `components/ThumbnailDrawer.tsx`
- `components/SceneDrawer.tsx`
- `lib/workspace-context.tsx`
- `app/api/scene/regen-image/route.ts` (optional stub)

## Files modified
- `components/SceneCard.tsx` (click → open SceneDrawer with this scene id) — will be polished in UI-PR6
- `components/WorkspaceTopBar.tsx`
- `components/ThumbnailSlot.tsx` (reduce to interior of ThumbnailDrawer)
- `app/[category]/story/[id]/page.tsx` (wrap in provider, remove old layout, render drawers)

## Verification
- Thumbnail drawer floats top-right, does NOT overlap scene grid (scenes remain clickable behind it).
- Reload `/stickman/story/[id]?thumb=1` reopens drawer.
- Scene drawer slides right with backdrop. ESC closes. Outside click closes.
- Edit motion prompt → close → reopen → value persisted.
- Play button in scene drawer drives same audio reflected in bottom voiceover bar (no double-audio).
- Regen image button: either triggers regen or shows disabled "Coming soon" tooltip — consistent with chosen stub strategy.
- Multiple drawers can't open simultaneously? — actually thumbnail (floating) + scene drawer (slide-over) CAN coexist. Verify they stack without overlap glitch on z-index.
