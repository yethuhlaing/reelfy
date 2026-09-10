# Moles against the robustness bar

Primary source: this repo’s code as of the investigation. Not memory, not the wayfinder tickets.

Question: against the locked bar (A–E), where do the four fal video paths fail *today*?

## Bar

- **A. Reattach.** Refresh / new device / shareable URL resumes the in-flight or just-finished Run from server state, not from this tab.
- **B. Explicit cancel only.** Refresh is not cancel.
- **C. No double-enqueue.** Second submit while in-flight returns the existing work; it does not start a second fal request.
- **D. Retry after failed** is a first-class action.
- **E. Progress contract.** Client can show phase. Dropped SSE/poll must reconnect or reattach. Infinite loading is illegal if the server (or fal) is already terminal.

## How to read a hole

Each hole names the path, the bar item, the user-visible symptom, the code that causes it (`path` + `symbol`), and whether an existing backstop partially covers it.

---

## 1. Story scene animate

Stack: `POST /api/animate` → Redis job (`createJob`) → fal webhook `story/animate` → client `pendingJobId` + `useJobPoller` in Workspace.

Server work *does* survive: Redis job (`shared/lib/jobs/store.ts`, `JOB_TTL_SECONDS = 86400`) and, on webhook success, `scenes.video_url` via `completeSceneVideo`. The client handle does not.

### 1-A — Reattach

**Symptom.** Refresh, new device, or opening the story URL mid-animate shows a still image. The scene is not animating. If fal already finished and the webhook wrote `videoUrl`, a later load shows the video. If fal is still running (or the webhook never arrived), the Run is invisible.

**Cause.**

- `pendingJobId` and `lastError` live only on the client `Scene` type (`shared/lib/types/domain.ts`). They are not columns on `scenes` (`shared/lib/db/schema.ts`).
- `sceneRowToScene` (`features/stories/server/stories-db.ts`) never maps a job id. `GET /api/stories/[id]` → `fetchStory` → Workspace `useEffect` therefore hydrates scenes without `pendingJobId`.
- Workspace keeps the handle in React state: `enqueueAnimate` → `patchScene(..., { pendingJobId: jobId })` (`features/workspace/components/Workspace.tsx`). `useJobPoller` only polls ids from that state.
- `getJobIdsForStory` exists (`shared/lib/jobs/store.ts`) but is only used by `deleteJobsForStory`. Workspace never scans Redis on load.

**Backstop.** Just-finished is partially covered: webhook `completeSceneVideo` persists `videoUrl`, so a load *after* the webhook shows the clip. In-flight has no backstop. Missed webhook + completed fal has no reconcile (no `fal.queue.status` on this path).

### 1-B — Refresh is cancel

**Symptom.** After refresh the scene is idle and Animate is clickable again. The original fal request keeps running. The user has effectively cancelled the UI Run by refreshing.

**Cause.** Same as 1-A: losing `pendingJobId` drops `useJobPoller`. There is no animate cancel API. `SceneCardActions` renders a Stop button that calls `onCancel`, but `SceneCard` never passes `onCancel` (`features/workspace/components/cards/SceneCard.tsx`), so even the in-tab cancel is a no-op.

**Backstop.** None. Server job + fal continue; UI treats the Run as gone.

### 1-C — Double-enqueue

**Symptom.** After refresh (or from a second tab), Animate starts a second fal request for the same scene. Two webhooks can race on `animations/{storyId}/{sceneId}.mp4`.

**Cause.**

- Client guard is tab-local: `enqueueAnimate` / `SceneDrawer.handleAnimate` return early only if `scene.pendingJobId` is set (`Workspace.tsx`, `SceneDrawer.tsx`).
- `POST` (`app/api/animate/route.ts`) always `clearSceneVideo` then `createJob` then `provider.enqueue`. No lookup of an existing running animate job for `(storyId, sceneId)`.
- Enqueue failure after `createJob` returns 500 without `markFailed`, leaving an orphan Redis job.

**Backstop.** None.

### 1-D — Retry after failed

**Symptom.** In the same tab, a failed poll sets `lastError` and `SceneCardActions` shows Retry (`state === 'error'`). After refresh, `lastError` is gone, Retry is gone, and the button is just Animate. Failure is not durable.

**Cause.**

- `useJobPoller.onFailed` writes `lastError` only via `setStoryData` (`Workspace.tsx`).
- `sceneRowToScene` does not persist it. Webhook `markFailed` writes Redis only (`app/api/webhooks/fal/story/animate/[jobId]/route.ts`); the scene row is unchanged (still no video, no error).
- Drawer Animate label is `Animating…` / `Re-animate` / `Animate` — not Retry (`SceneDrawer.tsx`).

**Backstop.** Same-tab Retry on the card is first-class *until* unload. After unload, implicit re-click of Animate (which is a new enqueue, see 1-C).

### 1-E — Progress contract

**Symptom.** Phase is only “Animating” / “Slow” after 5 minutes (`sceneState` `STALE_MS`, `features/workspace/lib/scene-state.ts`). If the webhook never arrives, the tab polls Redis forever (backoff to 15s in `useJobPoller`). After refresh the poller is gone (1-A), so a terminal Redis/fal result is never observed. There is no “fal already completed” path.

**Cause.**

- `useJobPoller` (`features/workspace/hooks/use-poller.ts`): 404/`!res.ok` is ignored; loop continues while `pending` is non-empty. Network errors retry next tick (this part is fine *in-tab*).
- No `reconcile` / `fal.queue.status` for animate (only export and brainrot call `fal.queue.status`).
- Poller identity is `pendingJobId`. No pending id ⇒ no poll ⇒ no terminal signal.

**Backstop.** `sceneState` “stuck” after 5 minutes if the tab is still open and `jobStartedAt` was recorded. Not a terminal signal. No fal reconcile.

---

## 2. Story export

Stack: `POST /api/export` → Redis job → webhook `story/export` / `reconcileExportFromFal` on the SSE tick → client `ExportStateProvider` + `EventSource /api/export/[jobId]/stream`.

Unlike animate, this path *can* pull a missed webhook from fal — but only while this tab still holds `jobId` and the EventSource is connected.

### 2-A — Reattach

**Symptom.** Refresh or another device during export: the modal is idle, `RenderingPill` is gone, no job to resume. If a previous MP4 exists, the Video tab still shows that old file. The in-flight compose is invisible. After fal finishes and the webhook/reconcile writes `composedVideoUrl`, a *later* load shows the new video with no “it just finished” signal.

**Cause.**

- `jobId` exists only in `startExport`’s closure (`features/workspace/context/export-state.tsx`). Not on `stories`, not in the URL.
- `ExportStateProvider` state is in-memory (`useState`). Workspace page (`app/dashboard/story/[id]/page.tsx`) renders `<Workspace>` with no job hydration. `GET /api/stories/[id]` returns `composedVideoUrl` / `composedAt`, not an export job id.
- `getJobIdsForStory` is unused for reattach.

**Backstop.** Just-finished is partially covered: `finalizeExport` → `completeComposedVideo` persists `composedVideoUrl` + `composedAt`. Next `fetchStory` shows the Video tab. In-flight has no backstop. Reconcile does **not** run on page load (only inside the SSE loop).

### 2-B — Refresh is cancel

**Symptom.** Refresh closes the EventSource and wipes export UI. Fal/Redis keep going. The user can start another export. Modal **Cancel** does the same thing as refresh: it does not cancel fal.

**Cause.** `cancelExport` / `reset` (`export-state.tsx`) increment `runIdRef`, `closeStream()`, set state to `idle`. No server cancel route. Refresh unmounts the provider — same effect.

**Backstop.** Work continues server-side; UI session is cancelled. `reconcileExportFromFal` only runs if some client still has the stream open.

### 2-C — Double-enqueue

**Symptom.** Second Start Export (other tab, or after refresh) always submits a new `fal-ai/ffmpeg-api/compose`. Two jobs, two fal requests, last writer of `composed/{storyId}.mp4` wins.

**Cause.** `POST` (`app/api/export/route.ts`) always `createJob` + `fal.queue.submit`. No “already exporting this story” check. Client `startExport` always increments `runId` and POSTs; it does not ask the server for an existing job.

**Backstop.** None. Modal hides Start while `showProgress` in *this* tab only.

### 2-D — Retry after failed

**Symptom.** Failed modal shows a Retry button. It does not re-submit. It calls `reset()`, which returns to the options form. The user must click Start Export again (a new Run). After refresh the failure is gone (`state.error` was client-only).

**Cause.** `ExportModal` failed branch: `<Button onClick={reset}>Retry</Button>` (`features/workspace/components/ExportModal.tsx`). Redis `markFailed` is not read on load. Story status is not set to `failed` on export failure (`finalizeExport` / webhook only `markFailed` the Redis job).

**Backstop.** None that preserves the failed Run. User can start a brand-new export.

### 2-E — Progress contract

**Symptom.** Phase is only preparing vs “Composing video on server…” (`ExportModal`). Heartbeats are `{ status: 'progress' }` with no fal phase. If the stream dies after 8 error retries, the modal shows **Export failed / Stream connection lost** even when Redis/fal are still running — or already `completed` with a URL the client will never see until refresh.

**Cause.**

- Client reconnects on `{ status: 'reconnect' }` and on `onerror` up to `MAX_ERR_RETRIES = 8` (`export-state.tsx`). After that it `reject`s. `OVERALL_DEADLINE` is 20 minutes, then “Export timed out” — same false-failed UI.
- `reconcileExportFromFal` (`features/stories/server/export-finalize.ts`) is invoked only from the SSE loop (`app/api/export/[jobId]/stream/route.ts`), throttled every 5s. No page-load reconcile. Once the client gives up, reconcile stops.
- Redis job TTL 24h (`JOB_TTL_SECONDS`). After expiry, stream sends `Job not found` / failed even if fal still has the result.

**Backstop.** While SSE is alive, reconcile + webhook cover missed callbacks. After client drop: webhook may still persist `composedVideoUrl`; user sees it only on a later load (A backstop, not E). No dashboard reconcile for story export (unlike brainrot).

---

## 3. Brainrot export

Stack: `POST /api/brainrot/export` persists `status: 'rendering'` + `renderJobId` → compose then subtitle fal Steps → webhook `brainrot/export` → SSE `/api/brainrot/[id]/stream?jobId=` → client `BrainrotProjectPageClient`. SSR reconcile on the project page and dashboard.

This is the only path that stores a job id on the durable target. Reattach and progress still break because the live transport is tied to `?jobId=` and does not reconnect.

### 3-A — Reattach

**Symptom.** Form navigates to `/dashboard/brainrot/{id}?jobId=…`. Refresh *with* `jobId` keeps the query and re-opens SSE. Refresh *without* `jobId` (dashboard card, shared URL, `router.replace` after done, or a user stripping the query): if the project is still `rendering`, the page shows “Rendering reel…” forever and never opens a stream. New device using `brainrotHref(id)` has the same hole.

**Cause.**

- `BrainrotCard.open` → `brainrotHref(brainrot.id)` — no `jobId` (`features/brainrot/components/BrainrotCard.tsx`).
- `BrainrotProjectPageClient`: `rendering` is `initial.status === 'rendering' || !!jobId`, but the EventSource effect returns immediately when `!jobId` (`features/brainrot/components/BrainrotProjectPageClient.tsx`).
- After success the client `router.replace`s the URL *without* `jobId`. Fine when `complete`; if replace raced or the user bookmarked the clean URL mid-flight, they lose the only client handle.

**Backstop.** `app/dashboard/brainrot/[id]/page.tsx` calls `reconcileBrainrotExportFromFal` up to twice when `status === 'rendering' && renderJobId`. `DashboardContent` reconciles stuck rendering rows the same way. That covers **just-finished / missed webhook** if fal is already terminal. It does **not** subscribe to an in-flight Run. No poll after SSR.

### 3-B — Refresh is cancel

**Symptom.** Refresh does not flip the project off `rendering` and does not cancel fal. This item mostly **holds** on the server. There is no explicit cancel control.

**Cause.** `POST /api/brainrot/export` never cancels the previous job. No cancel route. Client has no cancel button.

**Backstop.** N/A (server Run survives). Combined with 3-A, the user sees a stuck spinner rather than a cancelled Run.

### 3-C — Double-enqueue

**Symptom.** A second export POST (second tab, or the form if they never navigated away) charges again (unless caption-only), sets `outputVideoUrl: null`, creates a new Redis job, overwrites `renderJobId`, and submits another compose. The first fal Run is orphaned.

**Cause.** `POST` (`app/api/brainrot/export/route.ts`) does not read `project.status === 'rendering'` or the existing `renderJobId`. `BrainrotForm.handleExport` only disables the button via local `exporting` (`features/brainrot/components/BrainrotForm.tsx`).

**Backstop.** None.

### 3-D — Retry after failed

**Symptom.** Failed project page offers “Start a new reel” → `/new?category=brainrot`. That is a new project, not a retry of this Run. There is no Retry on this project.

**Cause.** `BrainrotProjectPageClient` failed CTA (`router.push('/new?category=brainrot')`). No client call back into `POST /api/brainrot/export` with the same `projectId`. Webhook / `failBrainrotExport` set `status: 'failed'` and keep the script, but the UI does not reuse them.

**Backstop.** None. The export API *could* be re-POSTed with the same project; the page does not.

### 3-E — Progress contract

**Symptom.** Overlay is a single “Rendering reel…” with no compose vs subtitle phase. After ~240s the server sends `{ status: 'reconnect' }` and closes. The client **closes the EventSource and does not open another**. `onerror` also closes and does not reconnect. The overlay stays up (`rendering` remains true). If fal/Redis are already `completed` or `failed`, the tab can spin until the user leaves and the next SSR reconcile runs.

**Cause.**

```101:107:features/brainrot/components/BrainrotProjectPageClient.tsx
        } else if (data.status === 'reconnect') {
          es.close()
        }
      } catch { /* ignore */ }
    }

    es.onerror = () => es.close()
```

Effect deps are `[jobId, project.id, project.status, router]`. Closing the socket does not change them, so the effect does not re-run. Contrast `ExportStateProvider.connect()`, which treats `reconnect` as a first-class re-open.

Server window: `WINDOW_MS = 240 * 1000` then `{ status: 'reconnect' }` (`app/api/brainrot/[id]/stream/route.ts`). Stream requires `jobId` query param; no jobId ⇒ 400, and the client never asks (3-A).

**Backstop.** SSR + dashboard `reconcileBrainrotExportFromFal` on the next full navigation. Not on a dropped socket. Reconcile can advance compose → subtitle (`handleBrainrotComposeWebhook`) but the client still will not see it without a reload.

---

## 4. Lofi generate (including asset Steps)

Stack: `launchVideo` / `recomposeVideo` persist `lofi_videos` + assets → webhooks `lofi/asset` and `lofi/render` → Redis pub `lofi:video:{id}:status` → SSE `/api/lofi/videos/[videoId]/stream` → `LofiVideoView`. Explicit `cancelVideo` and `retryRender`.

Durable video + asset rows make **A and B mostly hold**. The holes are the typed `gating` phase that is never written, SSE that dies without reconnect, no fal reconcile, and fan-in that can leave a video `generating` after every Step is already terminal.

### 4-A — Reattach

**Symptom.** Refresh / new device / story URL generally works: `resolveStoryView` → `LofiVideoView` → `GET /api/lofi/videos/{id}` reads Postgres (`status`, assets, `finalVideoUrl`). In-flight shows Generating/Rendering; just-finished shows the MP4.

**Cause.** This item largely **passes**. Residual: SSE `onerror` closes without reconnect (`LofiVideoView.tsx`). After a dropped socket the tab freezes on the last client status until the user refreshes (reattach via fetch, not via the socket). Redis status TTL is 1 hour (`VIDEO_STATUS_TTL` in `lofi-orchestrator.ts`); the stream does not fall back to Postgres after the initial terminal check.

**Backstop.** Page load `fetchStatus` is the reattach. No fal reconcile on that GET.

### 4-B — Refresh is cancel

**Symptom.** Refresh does not abort the video. Explicit **Cancel generation** calls `POST /api/lofi/videos/{id}/cancel` → `cancelVideo`. This item **holds**.

**Caveat (not a refresh-cancel):** `cancelVideo` (`lofi-orchestrator.ts`) updates Postgres (`generating`|`rendering` → `aborted`) and refunds, but does not `publishVideoStatus('aborted')` and does not cancel fal. Another tab’s SSE keeps seeing `generating`/`rendering` until Redis TTL or the 290s timeout. `handleRenderWebhook` ignores an already-`aborted` video, so a late fal success is dropped.

**Backstop.** Cancel is first-class in this tab (`LofiVideoView.handleCancel` also sets local `aborted`). Other listeners are not notified.

### 4-C — Double-enqueue

**Symptom (same video).** `retryRender` refuses unless `status === 'failed'`. `recomposeVideo` refuses unless terminal. `claimVideoForRendering` is compare-and-set `generating` → `rendering`. Same-video double compose is mostly prevented.

**Symptom (generate).** Each `launchVideo` inserts a **new** `videoId` + `storyId` (`lofi-orchestrator.ts`). A second Generate click is a second Run, not “return the existing work.” `LofiForm` / stock generate disable via `isSubmitting` only.

**Cause.** `POST /api/lofi/generate` and `/api/lofi-stock/generate` always `launchVideo`. No idempotency key.

**Backstop.** Per-video guards above. Not a same-target return of the in-flight generate.

### 4-D — Retry after failed

**Symptom.** Render/gate failure shows `FailurePanel` with **Retry render** → `POST .../retry-render` → `retryRender`. That is first-class for a `failed` video.

Holes:

- Failed **asset Steps** are not retried by that button; `retryRender` → `runArrangementAndRender` uses only `ready` assets (`loadReadyAssets`). The label “Retry render with ready assets” says so. There is no “retry this failed asset” action (webhook `retryAsset` is automatic, max 3, not user-facing).
- If no music is ready, Retry is hidden (`retryable = false`). User must recompose or start over.
- `aborted` is not `failed`; no retry-render. Recompose is available when terminal.

**Cause.** `retryRender` (`lofi-orchestrator.ts`); `FailurePanel` (`LofiVideoView.tsx`). Asset webhook retries are internal (`handleAssetWebhook` / `retryAsset`).

**Backstop.** `retry-render` for render-stage `failed`. Recompose for a full new asset pass. Not a first-class retry of a failed Step.

### 4-E — Progress contract

Several independent moles:

**4-E1. Typed `gating` never written.**

**Symptom.** UI is ready to show “Arranging” / “Compiling arrangement...” (`LofiVideoView` `STATUS_META.gating`, `LofiProgress` `status === 'gating'`). Users never see it. Fan-in jumps `generating` → `rendering`.

**Cause.** `LofiVideoStatus` includes `'gating'` (`shared/lib/db/schema.ts`, `shared/lib/types/domain.ts`). `maybeAdvanceVideo` calls `evaluateGate` then `claimVideoForRendering` (sets `rendering`) then `runArrangementAndRender`. Nothing `updateLofiVideo(..., { status: 'gating' })` or `publishVideoStatus(..., 'gating')`. `cancelVideo` SQL only lists `generating` and `rendering`.

**Backstop.** None. Arrangement is folded into the rendering phase.

**4-E2. Dropped SSE does not reconnect.**

**Symptom.** Proxy drop / browser `error` → spinner frozen on last phase. Refresh fixes (4-A).

**Cause.** `es.onerror = () => es.close()` (`LofiVideoView.tsx`). Deps are `[data?.status, id, fetchStatus]`; a silent close does not change `data.status`.

**Backstop.** Manual refresh → `fetchStatus`. Stream `TIMEOUT_MS = 290s` sends `{ status: 'timeout' }` (`app/api/lofi/videos/[videoId]/stream/route.ts`). Client treats `timeout` as a status, which is not in `isActive` and not in `terminal`, so the progress card vanishes and the badge can show raw “timeout”. That status change *does* remount EventSource. Render copy says “5-15 min”, so a healthy render hits this timeout.

**4-E3. No fal reconcile; infinite generating/rendering when Steps are already terminal.**

**Symptom.** Missed asset or render webhook: video stays `generating` or `rendering` in Postgres. Refresh reattaches to that non-terminal status. SSE polls Redis only (after an initial DB terminal short-circuit). Fal can already be `COMPLETED`. Infinite loading.

Further stuck cases with assets already terminal:

- `submitAssets` (`lofi-orchestrator.ts`): on submit exception an asset is `failed`, but `maybeAdvanceVideo` is not called (except stock, or a sync visual). If every AI asset fails at submit, fan-in never runs → stuck `generating`.
- `handleRenderWebhook` blob-upload `catch` sets DB `failed` but does not `publishVideoStatus('failed')`. SSE can sit on `rendering` until timeout while the server is already `failed`.
- `cancelVideo` does not publish `aborted` (see 4-B).

**Cause.** No `fal.queue.status` / `reconcile` under `features/lofi/`. Stream `GET` (`app/api/lofi/videos/[videoId]/stream/route.ts`) reads Redis `lofi:video:{id}:status` only. Status GET returns DB as-is.

**Backstop.** None for fal-already-terminal. `retry-render` only if someone has already marked `failed`. Webhook success is the only happy path.

---

## Contradictions (cross-cutting)

### Typed `gating` is never written

`LofiVideoStatus = 'planning' | 'generating' | 'gating' | 'rendering' | 'complete' | 'failed' | 'aborted'` in `shared/lib/db/schema.ts` and `shared/lib/types/domain.ts`. Writers: `launchVideo` / `recomposeVideo` set `generating`; `claimVideoForRendering` sets `rendering`; `finalizeLofiVideo` sets `complete`; fail/cancel set `failed` / `aborted`. Grep finds **no** `status: 'gating'` assignment. UI (`LofiProgress`, `LofiVideoView`) still branches on it. See hole 4-E1.

### `/api/compose` is unused

`app/api/compose/route.ts` and webhook `app/api/webhooks/fal/story/compose/[jobId]/route.ts` implement a Redis `compose` job (`JobType` includes `'compose'` in `shared/lib/jobs/types.ts`). No client or server caller fetches `/api/compose` (repo-wide). Live story compose is `/api/export` + `story/export`. Orphan path: not a bar hole on a live Run, but a second write path for `completeComposedVideo` if anything ever hits it.

### Story status `rendered` vs writers that use `ready`

`StoryStatus` includes both `'ready'` and `'rendered'` (`shared/lib/db/schema.ts`). Dashboard labels both as success (`StoryCard` `STATUS_LABEL`).

| Writer | Status written |
| --- | --- |
| `upsertStoryWithScenes` / `POST /api/generate` (story ready) | `'ready'` |
| `completeComposedVideo` (`features/stories/server/story-assets.ts`) — story **export** and unused compose webhook | `'rendered'` |
| `finalizeLofiVideo` (`features/lofi/server/lofi-db.ts`) — lofi MP4 on the same `stories` row | `'ready'` |

Same outcome (composed MP4 exists), two statuses. Export does **not** write `ready`; lofi finalize does, despite the type offering `rendered`. Workspace video tab keys off `composedVideoUrl`, not status, so the split is mostly dashboard chrome — but it is a real contract fork for any kernel state machine.

### Brainrot SSE “reconnect” does not reconnect

Server (`app/api/brainrot/[id]/stream/route.ts`) documents the 240s window the same way story export does: send `reconnect`, client should resume. Story export’s `ExportStateProvider` reconnects. Brainrot’s `BrainrotProjectPageClient` only `es.close()`. See hole 3-E.

---

## Matrix (bar × path)

| | A Reattach | B Refresh ≠ cancel | C No double-enqueue | D Retry after failed | E Progress |
| --- | --- | --- | --- | --- | --- |
| **1 Animate** | Fail (tab-only `pendingJobId`) | Fail (refresh drops the only handle) | Fail (server always new fal) | Partial (in-tab Retry; not durable) | Fail (no reconcile; poll dies with tab) |
| **2 Story export** | Fail (tab-only `jobId`) | Fail (refresh ≡ `cancelExport`) | Fail (server always new fal) | Fail (Retry = `reset()`) | Partial (reconnect + reconcile while SSE live; false-failed after drop) |
| **3 Brainrot** | Fail without `?jobId=`; SSR helps only if fal already terminal | Pass (server status stays) | Fail (overwrites `renderJobId`) | Fail (“new reel”, not retry) | Fail (`reconnect` does not reconnect) |
| **4 Lofi** | Pass (Postgres); SSE drop needs refresh | Pass (explicit cancel) | Pass per video; generate always new video | Partial (`retry-render`; no Step retry) | Fail (`gating` dead; no fal reconcile; SSE close) |

Existing backstops worth keeping in the spec:

- Story animate webhook → `completeSceneVideo` (just-finished if the user loads later).
- Story export `reconcileExportFromFal` **while SSE is connected**.
- Brainrot `renderJobId` + `reconcileBrainrotExportFromFal` on project page and dashboard.
- Lofi Postgres row + `retryRender` + `cancelVideo`.
