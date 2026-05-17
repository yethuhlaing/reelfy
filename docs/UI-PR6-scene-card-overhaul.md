# UI-PR6 — Scene Card Overhaul (hover reveal, state badges, granular retry)

Goal: Clean default card visuals with hover-revealed actions, explicit play button (no implicit click-to-play), state badges, granular per-scene retry handlers.
Depends on: UI-PR5.

## Why
- Current `SceneCard` shows multiple buttons always-visible — adds noise (user complaint).
- Click-to-play is implicit — surprises users (they expect click → inspect).
- No clear state badge for skeleton / animating / error.
- Per-scene retry currently lives in scattered handlers; surface needs unification.

## Changes

### 1. Card visuals
File: `components/SceneCard.tsx`

Default state (no hover):
- Thumbnail (image or video poster)
- Scene number top-left
- State badge top-right (small pill, see below)
- No buttons visible.

Hover/focus reveal (overlay fade-in, 120ms):
- Bottom action strip with icon buttons:
  - `▶ Play` — single-scene voiceover (does not enter Play All mode)
  - `✦ Animate` / `⏸ Cancel` / `↻ Retry` (one slot, state-driven)
- Top-right small ⋯ menu reveals: Open details (= scene drawer), Regen image, Regen voice, Copy text

Click on card body (not on a button) → open SceneDrawer with this scene's ID.

### 2. State badges
Top-right small pill, state-driven, single source from helper:

```ts
function sceneState(scene: Scene): 'skeleton' | 'image' | 'animating' | 'video' | 'error' {
  if (scene.lastError && !scene.pendingJobId) return 'error'
  if (scene.pendingJobId) return 'animating'
  if (scene.videoUrl) return 'video'
  if (scene.imageUrl) return 'image'
  return 'skeleton'
}
```

Badge appearance:
- skeleton → none (card itself is shimmer)
- image → none (clean — most common state)
- animating → small spinner pill `Animating`
- video → small `▶` icon pill (subtle)
- error → red dot + error icon; hover shows `scene.lastError` in tooltip; click → retry

### 3. Skeleton state
New file: `components/SkeletonSceneCard.tsx`

- Used during generation when scene exists in array but no image yet.
- Shimmer animation across thumbnail area.
- Static "Scene N" label.
- No interactive buttons.

`SceneGrid` mixes skeletons + real cards based on state.

### 4. Playing indicator
- When `playState.currentIndex === thisIndex && isPlaying`: card gets pulsing ring (CSS animation) + bold scene number.
- Removed when stopped.

### 5. Per-scene retry handlers
File: `lib/workspace-context.tsx` (extend from UI-PR5)

Add handlers exposed via hook:
- `retryAnimate(sceneId)` → calls `enqueueAnimate` (existing logic from page.tsx)
- `retryImage(sceneId)` → POST `/api/scene/regen-image` (stub or real)
- `retryVoice(sceneId)` → clears `voiceoverUrl`, refetches via `/api/voiceover`
- `cancelAnimate(sceneId)` → existing handler

All handlers update local state via `patchScene` + persist via `updateStoryScene`.

### 6. Mobile / touch
- Touch-detect (no hover capability) → always-visible bottom action strip (compact, smaller icons).
- Otherwise hidden until hover.

CSS via media query `@media (hover: hover) { ... }` for hover-reveal; fallback otherwise.

### 7. Animate-all integration
- Cards reflect batch state: when `animateAll` is mid-run, all pending cards already show `animating` badge through existing `pendingJobId` flow. No extra wiring.

### 8. Error UI on card
- Error badge click → opens scene drawer scrolled to error block.
- Hover tooltip: first line of `lastError`.
- "Retry" overlay button replaces `Animate` slot when error state.

### 9. Click semantics summary
| Element | Action |
|---|---|
| Card body | Open SceneDrawer |
| ▶ Play (hover) | Play single scene voiceover |
| Animate/Cancel/Retry | State-driven action |
| ⋯ menu item | Specific regen / copy |
| Error badge | Open drawer at error |

No element silently triggers playback on card body click anymore.

## Files added
- `components/SkeletonSceneCard.tsx`
- `components/SceneCardActions.tsx` (hover overlay extracted)
- `components/SceneStateBadge.tsx`

## Files modified
- `components/SceneCard.tsx` (rewrite using new sub-components)
- `components/SceneGrid.tsx` (mix skeletons + real cards based on state, route click to drawer)
- `lib/workspace-context.tsx` (retry handlers)
- `styles/globals.css` (hover reveal, pulsing ring, shimmer)

## Verification
- Default card: thumbnail + scene # + (optional) badge. No buttons.
- Hover desktop: bottom strip fades in with appropriate state action.
- Touch / mobile: actions always visible at card bottom.
- Click card body → SceneDrawer opens for that scene (does NOT start audio).
- Click ▶ → audio plays, ring pulses on that card, voiceover bar shows.
- Animate one scene fails → red dot badge. Hover shows error. Click error → drawer at error block. Retry → re-enqueues.
- Animate All: cards show `Animating` badge until video arrives.
- Skeleton cards appear during generation, replaced as `scene-image` events arrive.
- No `onClick={() => playScene(index)}` left in card body.
