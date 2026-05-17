# UI-PR10 — Playback Polish + Error Recovery Sweep + Responsive

Goal: Finalize VoiceoverBar (prev/next/pause, workspace-scoped), sweep remaining `alert()` and ad-hoc errors into inline/toast pattern, add stuck-job detection, define responsive breakpoints for the new shell.
Depends on: UI-PR4, UI-PR6.

## Why
- Current VoiceoverBar only supports Stop — Play All can't be paused or skipped scene-to-scene.
- `alert()` still used in `app/page.tsx` generate-failure path. SaaS quality requires inline banners / toasts.
- Webhook-driven jobs can hang silently. User should see "taking longer than usual" after 5min.
- The new 3+ surface UI (sidebar, top-bar, drawers, bottom bar) needs explicit responsive behavior to avoid breaking <1024px.

## Changes

### 1. VoiceoverBar polish
File: `components/VoiceoverBar.tsx`

- Render ONLY on workspace pathname (`/[category]/story/[id]`). Hidden on dashboard/new/settings. Use Next `usePathname()`.
- Layout: thumbnail thumb + scene # + voiceover-line text + scrub bar + `⏮` `⏯` `⏭` + `✕ Stop`.
- Prev / Next buttons jump scenes:
  - Stop current audio
  - Call `playScene(currentIndex - 1)` or `+1` (existing helper, exposed via workspace context)
  - Wrap or clamp (clamp recommended — no wrap)
- Pause button toggles audio play/pause (uses shared `audioRef`).
- Scrub bar:
  - Reflects `audioRef.currentTime / audioRef.duration`
  - Drag to seek
  - Updates via `requestAnimationFrame` while playing
- Click scene # in bar → opens SceneDrawer at current scene.

### 2. Shared audio source
- VoiceoverBar + SceneDrawer (UI-PR5) both read/write the same `audioRef` from `useWorkspace()`.
- Drawer play btn flips `playState.isPlaying`; bar reflects it.
- Single source of truth → impossible to double-play.

### 3. Stuck-job detection
File: `lib/workspace-context.tsx` (extend)

- Track `pendingJobStartedAt` already exists in current `page.tsx` (`jobStartedAtRef`).
- Add derived field: `scene.staleSince = now - startedAt > 5*60*1000`.
- Scene card badge: when `pendingJobId && staleSince` → yellow flag badge instead of regular animating pill. Tooltip: "Taking longer than usual. Cancel or wait?"
- Drawer error block also reflects.

### 4. Sweep `alert()` usage
Files to audit:
- `app/[category]/story/[id]/page.tsx` (current generate failure)
- `components/ExportButton.tsx` (any alert before replacement in UI-PR9)
- Any other surface

Replace with:
- Generate failure → inline banner in workspace top area + toast (UI-PR8)
- Voiceover playback failure → toast + per-scene retry surfaced on card (UI-PR6)
- Network errors → toast

Verification grep: `rg "\\balert\\(" components app` → should return zero hits after PR.

### 5. Inline error banner
New file: `components/InlineBanner.tsx`

- Reusable banner: variant (error/warning/info), title, message, dismiss, optional action button.
- Used by:
  - Workspace top area for generation failure
  - Story form (UI-PR3) for submit errors
  - Export modal for compose errors

### 6. Responsive breakpoints
File: `styles/globals.css` + media queries inside components

**≥1024px (desktop):**
- Sidebar full width (240px)
- Workspace top-bar shows all actions inline
- ThumbnailDrawer placement `top-right` (floats)
- SceneDrawer slide-over (480px)

**768–1023px (tablet):**
- Sidebar collapses to icon-rail (64px)
- Workspace top-bar: overflow some actions into `⋯` menu (keep Play All + Animate All visible; move Thumbnail into ⋯ if cramped)
- ThumbnailDrawer placement switches to slide-over `right`
- VoiceoverBar wraps content (smaller fonts)

**<768px (mobile):**
- Sidebar collapses to hamburger menu (left sheet)
- Top-bar sticky, story title truncates aggressively, primary actions become bottom action bar
- ThumbnailDrawer → bottom sheet (swipe up)
- SceneDrawer → full-screen modal
- ExportModal → full-screen
- SceneGrid → 1 column
- VoiceoverBar → fixed bottom above any drawer/sheet
- Hover overlays on scene cards → always-visible compact action strip

Implementation: combine CSS container queries (preferred) + media queries. Avoid JS resize handlers.

### 7. Bottom-sheet primitive
New file: `components/BottomSheet.tsx`

- Used for thumbnail + scene drawer on mobile.
- Snap points: 50%, 90%.
- Swipe down to dismiss.
- Conditionally rendered instead of `Drawer` on `<768px`.

Decision: keep `Drawer` API and have it internally choose `BottomSheet` on mobile via media query hook, OR pick at render site. Recommend internal switch — single API.

### 8. Sample story read-only enforcement
- Audit all action handlers: if `storyId === 'sample'` → return early.
- Visual disable already done in UI-PR4 (top-bar pill).
- Add per-card overlay "Read-only" on hover.

## Files added
- `components/InlineBanner.tsx`
- `components/BottomSheet.tsx`

## Files modified
- `components/VoiceoverBar.tsx`
- `components/SceneCard.tsx` (yellow stuck badge)
- `components/Drawer.tsx` (mobile → BottomSheet branch)
- `components/WorkspaceTopBar.tsx` (overflow logic by viewport)
- `lib/workspace-context.tsx` (stale detection)
- `app/[category]/story/[id]/page.tsx` (replace alert, banner integration)
- `styles/globals.css` (breakpoints, hover-capability queries)

## Verification
- VoiceoverBar prev/next jumps scenes; pause/resume works mid-scene; scrub seeks audio.
- VoiceoverBar absent on /dashboard, /new, /settings; present on workspace.
- Audio cannot double-play between bar and SceneDrawer.
- `rg "\\balert\\(" components app` returns zero.
- Generate failure on workspace → red inline banner + retry CTA + toast.
- Animate scene; force a stuck state (e.g. mock pendingJobId older than 5min) → yellow flag badge appears with tooltip.
- 1280px viewport: full desktop layout, sidebar full, all actions visible.
- 900px viewport: sidebar icon-rail, top-bar still mostly inline.
- 500px viewport: hamburger sidebar, scene grid 1-col, drawers become bottom sheets, ExportModal full-screen, hover actions always visible.
- Sample story: every action no-ops with "Read-only" tooltip.
- Lighthouse mobile pass score (>90 perf, >95 a11y) on /dashboard and workspace.
