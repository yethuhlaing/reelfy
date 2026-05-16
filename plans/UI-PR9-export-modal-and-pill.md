# UI-PR9 — Export Modal + Background Rendering Pill

Goal: Replace inline ExportButton with focused modal (format/resolution/range options + progress view). When user closes modal mid-render, progress moves to a top-bar pill so other work isn't blocked.
Depends on: UI-PR4.

## Why
- Export = discrete task with options → deserves modal (focus task).
- Compose pipeline (PR5 backend) is webhook-driven and runs minutes — user shouldn't sit on a modal staring at a progress bar.
- Background pill matches the `Stop generation` pattern from UI-PR4 → consistent.

## Changes

### 1. Export modal
New file: `components/ExportModal.tsx`

Two views inside same modal shell:

**View A — Options:**
- Title: "Export video"
- Format: MP4 (locked for now — can add more later)
- Resolution: 720p / 1080p (radio)
- Include thumbnail intro: toggle
- Scene range:
  - "All scenes" (default)
  - "Range: N–M" (two number inputs)
- Estimated duration (sum of `scene.voiceoverDuration`)
- Primary button: `Start Export`
- Secondary: `Cancel`

**View B — Progress:**
- Composer scribble (small `<StickmanScribble variant="small" />`)
- Step list (composer pipeline stages from PR5 backend):
  - "Concatenating scenes…"
  - "Mixing audio…"
  - "Encoding video…"
  - "Uploading…"
- Progress bar (%)
- Cancel button (calls compose job cancel via PR6 backend)
- On success: replaces with `Download` button + `Render again` + `Close`

### 2. Background pill
New file: `components/RenderingPill.tsx`

- Shown in top-bar when an export is rendering AND modal is closed.
- Format: `⬇ Rendering 42%`
- Click pill → re-opens modal in View B.
- Hidden when no render in progress.

### 3. Export state context
New file: `lib/export-state.ts`

React context exposing:
```ts
{
  exportState: {
    storyId: string
    status: 'idle' | 'rendering' | 'done' | 'failed'
    progress: number
    jobId?: string
    downloadUrl?: string
    error?: string
    stage?: 'concat' | 'mux' | 'encode' | 'upload'
  } | null
  startExport(opts): Promise<void>
  cancelExport(): Promise<void>
  reset(): void
}
```

Mounted at workspace page level (per-story). Pill + modal both read this state.

### 4. Compose job polling
- POST `/api/compose` → returns `{ jobId }` (existing backend).
- Use existing `useJobPoller` for the compose job.
- On stage transitions in poll result → update `exportState.stage` + `progress`.
- On `completed` → `status='done'`, store `downloadUrl`.
- On `failed` → `status='failed'`, store `error`.

### 5. Replace existing ExportButton
File: `components/ExportButton.tsx`

- Either fully replace OR keep as compatibility wrapper that delegates to new modal trigger.
- Workspace top-bar `<ExportBtn />` (UI-PR4) now opens `<ExportModal />` from this PR.

### 6. Top-bar wiring
File: `components/WorkspaceTopBar.tsx`

- `<ExportBtn />` shows when `anyVideoReady`.
- `<RenderingPill />` shows when `exportState?.status === 'rendering'` AND modal closed.
- Both can coexist; pill is the "modal closed" affordance.

### 7. Notification integration
- Export complete → push notification (UI-PR8): "Story X exported — Download" link to `downloadUrl`.
- Export failed → red toast + bell entry.
- If user still has modal open: no toast (modal shows it). If closed (pill visible): toast.

### 8. Mobile
- Modal becomes full-screen on `<768px`. Same content, vertical layout.
- Pill stays visible in mobile top-bar (compact icon + %).

### 9. Cancel idempotency
- PR6 backend ensures webhook is idempotent. UI just calls cancel route + locally marks `failed`.
- If completion webhook fires after cancel → backend returns `ok` without overwriting. UI ignores stale completion via `jobId` check.

## Files added
- `components/ExportModal.tsx`
- `components/RenderingPill.tsx`
- `lib/export-state.ts`

## Files modified
- `components/ExportButton.tsx` (replace or thin wrapper)
- `components/WorkspaceTopBar.tsx` (wire button + pill)
- `app/[category]/story/[id]/page.tsx` (mount export-state provider)
- `lib/jobs/use-poller.ts` (no change required — already supports the job shape)
- `lib/notifications.ts` (no change — uses existing API)

## Verification
- ≥1 scene has video → Export button visible.
- Click Export → modal opens to View A.
- Configure 1080p + range 2–6 + thumbnail intro → Start.
- Modal switches to View B → progress increments → stages flip.
- Close modal mid-render → top-bar pill `⬇ Rendering 42%` appears.
- Click pill → modal re-opens at current progress.
- Cancel → modal/pill clear, job cancelled (no later completion writes blob).
- On success → download button + close → modal closes → pill gone.
- Export complete while user on /dashboard → toast + bell + tab title.
- Mobile: modal full-screen, pill compact.
