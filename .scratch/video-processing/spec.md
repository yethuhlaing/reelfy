# Video processing kernel

Status: ready-for-agent

A user starts a video and leaves — refresh, another device, a dropped stream. Fal may already be done. Today the UI can spin forever or forget the work. This spec is the contract that makes a Run survive that, for all four fal video paths, without a new queue platform.

## Problem Statement

I generate a video, refresh the page, and the work looks gone — or it looks like it is still rendering forever even though fal already finished. I can click Generate again and pay twice. Cancel is either missing or the same as refresh. Retry disappears after reload. Progress dies when the stream drops. I want one reliable wait: start, leave, come back, see the video or a real failure I can retry.

## Solution

Every user-facing video action is a **Run** owned by the server. Refresh reattaches to that Run. Fal finishing without our webhook still becomes a video (or a failure) because we ask fal on read. A second click returns the in-flight Run. Only an explicit cancel aborts. Failed Runs can be retried. Progress can drop; the next load still knows the phase. Credits are reserved on start and not charged twice for the same Run.

## User Stories

1. As a user animating a scene, I want the animation to keep going if I refresh, so that I do not lose the wait or the fal request.
2. As a user animating a scene, I want the still to show “animating” again after reload, so that I know work is in progress.
3. As a user who opens the story on my phone while my laptop is animating, I want to see the same in-flight Run, so that the story is not tab-local.
4. As a user who shares the story URL mid-animate, I want the recipient to see animating or the finished clip, so that the URL is the source of truth.
5. As a user whose animate webhook never arrived, I want the clip to appear once fal has completed, so that I am not stuck on a still with a silent fal success.
6. As a user who clicks Animate twice, I want only one fal request, so that I do not pay twice or race two MP4s onto the same scene.
7. As a user who refreshes mid-animate, I want Animate not to start a second request, so that refresh is not an accidental double-run.
8. As a user whose animate failed, I want Retry to still be there after reload, so that failure is durable.
9. As a user retrying a failed animate, I want the same scene to be the Target, so that I am not managing job ids.
10. As a user who wants to stop an animation, I want an explicit cancel, so that closing the tab does not mean cancel and clicking cancel does.
11. As a user who cancelled animate, I want a late fal result ignored, so that a cancelled scene does not suddenly gain a video.
12. As a user exporting a story, I want export to continue after refresh, so that the compose is not tied to the modal.
13. As a user who reopens the story during export, I want to see that export is running, so that I do not think it died.
14. As a user whose export webhook missed, I want the composed video to land anyway, so that I am not staring at “composing” while fal is done.
15. As a user who starts export twice, I want the second start to join the first Run, so that two composes do not overwrite each other.
16. As a user whose export “failed” because the stream dropped, I want that not to be a real failure if fal is still working or already done, so that a dead socket is not a dead export.
17. As a user whose export truly failed, I want Retry to re-run compose for this story, so that I do not fill the form again from scratch.
18. As a user who cancels export, I want fal cancel attempted and the modal/pill cleared, so that cancel is a real stop, not only hiding UI.
19. As a user exporting a brainrot project, I want status `rendering` plus the Run to be enough to resume, so that I do not need `?jobId=` on the URL.
20. As a user opening a brainrot project from the dashboard mid-export, I want to see progress (or the finished reel), so that the card link is enough.
21. As a user whose brainrot compose finished and subtitle has not, I want one Run with two Steps, so that I do not see a finished reel that is missing captions, or a stuck spinner between phases.
22. As a user whose brainrot webhook missed after fal completed, I want the next page load to finalize the reel, so that dashboard and project page heal the miss.
23. As a user who hits export again on a rendering brainrot project, I want the existing Run back, so that I am not charged again and the first compose is not orphaned.
24. As a user whose brainrot export failed, I want Retry on this project, so that I am not sent to “start a new reel”.
25. As a user retrying brainrot after compose succeeded and subtitle failed, I want subtitle retried without composing again, so that I do not pay for duplicate compose.
26. As a user whose brainrot progress stream asks to reconnect, I want the client to reconnect or reattach, so that “Rendering reel…” cannot last forever on a dead socket.
27. As a user generating lofi, I want refresh to show generating or rendering from the server, so that the wait belongs to the video URL, not the tab.
28. As a user generating lofi, I want asset Steps (music/visuals) to be part of the same Run, so that leaving during asset gen is the same contract as leaving during final compose.
29. As a user whose lofi asset webhook missed but fal completed the asset, I want fan-in to proceed, so that I am not stuck on generating with ready work on fal.
30. As a user whose lofi render webhook missed but fal completed compose, I want the MP4 on the next load, so that rendering is not infinite.
31. As a user whose lofi SSE errors or times out, I want the page to refetch the Run, so that a 5–15 minute render is not a frozen spinner.
32. As a user who clicks Generate lofi twice on the form, I want two videos only if I meant two videos; a double-submit on the same in-flight video must not start a second fal compose, so that I do not double-pay for one Target.
33. As a user who cancels lofi, I want generation marked aborted, unused credits returned, and other tabs told, so that cancel is visible everywhere.
34. As a user who cancelled lofi, I want a late fal compose ignored, so that an aborted video does not become complete.
35. As a user whose lofi render failed, I want Retry render with ready assets, so that I do not regenerate music I already have.
36. As a user whose lofi asset Step failed, I want that Step retried (or a clear reason Retry is unavailable), so that “retry render” is not a dead button when no music is ready.
37. As a user looking at progress, I want a phase that matches the current Step (animating, composing, subtitling, generating assets, rendering), so that I know what I am waiting for.
38. As a user, I want “loading” only while the Run is actually in flight, so that a completed or failed Run never shows an infinite spinner.
39. As a user who was charged for a Run, I want a second submit of that in-flight Run not to charge again, so that retries of the button are safe.
40. As a user who cancels before work is consumed, I want unused credits back, so that cancel is not a silent charge.
41. As a user whose Run failed, I want unused reserved credits released, so that failure does not eat the hold.
42. As a user retrying after failure, I want to pay only for work that will run again, so that a subtitle-only retry is not a full export charge.
43. As a user who comes back an hour after fal finished and our webhook never ran, I want a clear failure I can retry if we can no longer fetch fal’s result, so that I am not left in rendering with no way out.
44. As a user, I want refresh, navigation, and tab close not to cancel fal, so that leaving the page is safe.
45. As a developer implementing a fifth fal video path later, I want to call the same kernel operations, so that I do not reimplement webhook-or-bust.
46. As a developer reading a stuck Run, I want provider endpoint and request id on the current Step, so that reconcile can ask fal without archaeology.
47. As a developer handling fal webhooks, I want to ack within fal’s first-attempt timeout and still finalize, so that slow R2 uploads do not look like webhook failure.
48. As a developer handling fal webhooks, I want duplicate deliveries to no-op if the Step is already terminal, so that retries are safe.
49. As a developer, I want fal queue failure represented as completed-with-error, not a fictional FAILED status, so that reconcile matches fal.
50. As a developer, I want cancel to call fal’s cancel and still mark our Run aborted if fal is already in progress, so that we do not wait on marketplace models that ignore cancel.
51. As a user who finished a Run, I want the video URL on the Target (scene, story, project, lofi video), so that later visits do not need the Run record to play the file.
52. As a user starting a new animate on a scene that already has a clip, I want a new Run, so that re-animate is allowed once the previous Run is terminal.
53. As a user, I do not need a history list of old Runs in this work, so that the contract stays “current Run on this Target.”
54. As a user on a progress UI, I want poll or SSE equally acceptable, so that we do not rewrite working streams just to unify transport.
55. As a user whose story export wrote a video, I want the Video tab to show that file after reload even if I never had the modal open, so that completion is not a client event.
56. As a user on the brainrot overlay, I want the overlay to clear when the Run is complete or failed, so that I can watch or retry without a full navigation.
57. As a user on lofi, I want Cancel only while the Run is in flight, so that I cannot cancel a finished video.
58. As an operator in local dev without a public webhook, I want reconcile-on-read to still complete Runs, so that tunnels are a convenience not a requirement for correctness.
59. As a user who hits a server error after the Run was created but before fal accepted, I want the Run failed or retried without a dangling “running” forever, so that enqueue failure is terminal and retryable.
60. As a user, I want this reliability without a new job platform, so that fal’s queue remains the executor.

## Implementation Decisions

- **Seam.** One Video processing kernel is the only lifecycle implementation. HTTP routes, webhooks, and product pages are thin adapters. Tests and adapters cross that same kernel interface. Fal’s queue and the Run store are injected ports (real adapters in production, in-memory adapters in tests). Product “apply result” (write the MP4 URL onto the Target) is a third injected port so the kernel does not know scene vs story vs project vs lofi tables.
- **Do not use the chat `runs` table.** That table is chat production. Video processing persists its own Run records. Credit holds that foreign-key chat runs stay chat-only. Video processing credits go through a small credits port (`reserve`, `consume`, `release`) wrapping each path’s existing deduct/refund/settle behavior.
- **No new infra.** Keep fal queue + webhooks. No Inngest, QStash, or Trigger.dev for these four paths. Redis may fan out progress; it is not the source of truth (24h job TTL is why animate/export cannot stay Redis-only).
- **Identity.** A Run is unique in-flight per Target: scene (animate), story (export), brainrot project (export), lofi video (generate/render). `start` on an in-flight Target returns the existing Run: no second fal submit, no second reserve. When the Run is terminal, a new user action may start a new Run on the same Target (re-animate, re-export). Lofi **form** Generate creates a new Target (new lofi video) — that is a new Run, not a double-enqueue. Double-submit protection for lofi is per video id (retry/recompose/cancel), not per “user clicked Generate.”
- **Persistence.** Postgres is the source of truth for Run status, current Step, `providerRequestId`, `providerEndpoint`, error, and timestamps. At most one in-flight Run per Target (partial unique index on in-flight rows). Step list lives on the Run (JSON is enough). Redis/SSE remain optional progress hints with TTL; a client that only has Redis and loses it must recover via `get(Target)`.
- **States.** A Run is `pending` | `running` | `completed` | `failed` | `aborted`. Product status fields (lofi `generating`/`rendering`, brainrot `rendering`, story `ready`/`rendered`) are projections for existing UI, derived from the Run + current Step, not a second state machine. Do not use story `status` as the Run. Lofi typed `gating` is not a Run state; arranging may be a progress phase while the gate runs in process.
- **Steps.** Inner fal calls are Steps on the Run. Animate: one video Step. Story export: one compose Step. Brainrot: compose then subtitle (current Step’s provider ids are the ones reconcile uses; after compose they point at subtitle). Lofi: N asset Steps then one compose Step. A Step stores kind, status, provider pair, and result URL if any.
- **Kernel operations.** `start(Target)` idempotent; `get(Target)` always reconciles if in-flight; `cancel(Run)`; `retry(Run)` only from `failed`; `onWebhook` same converge as reconcile; `progress(Run)` returns status + phase + error. Callers never persist fal ids themselves.
- **Reconcile.** Webhook is the fast path, not the only path. On `get`, on progress ticks, and on dashboard/list reads of in-flight Targets: `fal.queue.status(endpoint, requestId)`. If `IN_QUEUE` / `IN_PROGRESS`, leave running. If `COMPLETED` without error, `fal.queue.result`, download media, rehost to our storage, complete the Step (and the Run if last Step). If `COMPLETED` with `error` / `error_type`, fail the Step. Do not look for queue status `FAILED` or `ERROR` — those are not fal queue statuses. Webhook body `OK` / `ERROR` is a different vocabulary; map `ERROR` to Step failure. If status/result is not found after the queue-result retention window (~1 hour after completion for our small JSON; shorter if the payload is large), fail the Run with a retryable error. Reconcile is idempotent if already `completed` / `failed` / `aborted`.
- **Apply result.** Completing the last Step writes the rehosted URL onto the Target (scene video, story composed video, brainrot output, lofi final video) the same way today’s finalize helpers do. Clients that only read the Target still see the file after a missed progress UI.
- **Webhook handlers.** Verify fal, find the Run/Step, ack `2xx` quickly (first attempt timeout is 15s; retries 120s). Download + R2 + fan-in must not block the ack — same `after()` pattern brainrot already uses. Tolerate at-least-once delivery. Ignore late success if the Run is `aborted`. Persist both provider ids on submit; reconcile needs the pair (no lookup by request id alone).
- **Cancel.** Refresh is not cancel. `cancel` marks `aborted`, `release` unused credits, best-effort `fal.queue.cancel` on in-flight Steps, publishes progress so other tabs do not stay “generating.” Fal may still complete an `IN_PROGRESS` marketplace job; we ignore that result. Offer cancel on all four paths (lofi already has it; the others gain the kernel op even if UI is a small Stop control).
- **Retry.** From `failed` only, same Target, same Run id (status back to `running`). Replay Steps that are not successfully completed. Brainrot: skip compose if compose Step already has a stored video URL. Lofi retry-render: compose from ready assets (keep today’s behavior) and also allow retrying failed asset Steps when that is what blocked the gate. `aborted` is not retryable; user starts a new action. Enqueue failure (Run created, fal submit threw) marks `failed` so retry is possible; do not leave `running` without provider ids.
- **Progress contract.** Phase = current Step kind (animating | composing | subtitling | generating_assets | rendering). Transport is free: poll or SSE. If the connection drops, reconnect or call `get(Target)`. It is illegal to show indefinite loading when `get` returns terminal. Client-side overall deadlines must not mark a Run failed while the server still has it running (today’s export 20-minute modal fail is out). Stream windows that send “reconnect” must actually reconnect (brainrot must match export).
- **Credits.** `start` reserves; duplicate `start` on in-flight Run does not reserve again. Consume as Steps succeed where the path already itemizes (lofi assets); otherwise consume the path’s current lump sum when fal accepts the Step. `cancel` and `fail` release unused reservation. `retry` reserves only for Steps that will run again. No Polar changes. Do not double-charge on webhook retry.
- **Orphan story compose route.** Not a live path. Out of this implementation unless it is deleted; if it stays, it must call the kernel like export. Do not keep a third write path onto composed video.
- **Deadline vs missed webhook.** Missed webhook + fal terminal = reconcile success. Fal never terminal past retention / NOT_FOUND = `failed` + retry. Do not invent a client timeout that lies.

## Testing Decisions

- **Seam.** Test only the kernel, with an in-memory Run store, a fake fal queue (submit / status / result / cancel, including `COMPLETED`+error, NOT_FOUND, and late result after abort), and a fake result sink. Do not test Next routes, EventSource, or Redis for lifecycle correctness. If a bug is “refresh lost the Run,” the failing test is `start` → drop all clients → `get(Target)` still running or completed — not a Playwright refresh.
- **Good tests.** External behavior at the kernel interface: idempotent start, reconcile after missed webhook, abort ignores late fal, retry skips completed Steps, credits port called once, terminal `get` not still running. Do not assert internal JSON shape of Steps beyond what `progress` returns. Do not assert webhook cryptographic details here (that stays a handler concern).
- **Modules under test.** The kernel and its fake adapters. Product adapters (scene/story/brainrot/lofi sinks) get thin tests that they write the URL they are given, not that they orchestrate fal.
- **Prior art.** None. This repo has no automated test suite or test runner today. Add the minimum runner needed to execute kernel tests only (unit-level, in-process). Do not bootstrap a full E2E stack for this spec.
- **Cases that must exist.** Missed webhook + `COMPLETED` with video URL; `COMPLETED` with error; in-flight `get` does not complete; second `start` same Target; `cancel` then webhook OK; retry brainrot subtitle-only; lofi asset Step complete unsticks `generating`; result NOT_FOUND after window fails the Run; webhook delivered twice.

## Out of Scope

- New infra (Inngest, QStash, worker fleet, moving fal video onto Trigger.dev).
- Chat production, meme PNG, story image generate.
- Unifying all clients onto SSE.
- Visual redesign of progress UI (phases may reuse existing copy).
- Polar / billing portal plumbing.
- A user-facing history of past Runs.
- Migrating chat `runs` / `creditHolds` to a global Run concept.
- Guaranteeing fal in-progress cancel for marketplace compose/subtitle models.
- Making local webhooks work without a tunnel (reconcile-on-read is the substitute).
- Deleting or rewriting `/api/compose` except “do not add features to it.”
- Observability product (metrics, dashboards) beyond persisting `error` on the Run.

## Further Notes

- Fal queue result is only retrievable for about an hour after completion (shorter for large JSON). Reconcile must download and rehost immediately. CDN URLs are a different clock; do not treat a fal media URL as durable storage.
- Fal may retry webhooks up to 31 times; handlers must stay idempotent. Redirects (including http→https and trailing slash) are treated as permanent webhook failure — `WEBHOOK_BASE_URL` must be the exact public URL.
- Existing backstops to keep: brainrot reconcile-on-read, export reconcile-while-streaming, lofi Postgres status + retry-render + cancel, animate webhook writing scene video. The kernel makes the first two universal and the last two durable.
- Implementation order that matches the moles: persist Run on Target → `get` reconciles → idempotent `start` → progress reattach → cancel/retry/credits. Animate and lofi gain the most from reconcile; export/brainrot already have pieces.
- Glossary: `CONTEXT.md`. Research: fal queue completion and moles inventory under `.scratch/video-processing/research/`.
