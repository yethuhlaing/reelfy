# Video processing lifecycle spec

Type: wayfinder:map
Status: open

## Destination

A spec for Video processing: one shared kernel contract that story animate, story export, brainrot export, and lofi generate all obey. **Published:** [Video processing kernel](spec.md) (`Status: ready-for-agent`).

## Notes

- Domain: Video processing. Glossary in `CONTEXT.md`. Consult **grilling** and **domain-modeling** on every HITL ticket; **research** on research tickets; **prototype** on the spec-outline ticket.
- Tracker: local markdown under `.scratch/video-processing/` (no `docs/agents/issue-tracker.md` yet). Remaining lifecycle tickets were synthesized by `/to-spec` rather than grilled one-by-one.
- Standing preferences: no new infra (no Inngest/QStash; do not move fal video onto Trigger.dev). A Run is the user-facing action; inner fal calls are Steps. “One contract” means a shared kernel specified here, not four parallel rewrites. Progress is a contract (phases + reattach), not a mandate to unify on SSE. Credits belong in the spec as rules, not Polar plumbing.
- Plan, don’t do: this map produced the spec, not the kernel code.

## Decisions so far

- [What fal exposes after a queue request finishes](issues/01-fal-queue-completion.md): Status/result/cancel need `(endpoint, request_id)`; queue `COMPLETED`+error is failure; ~1h result window; webhook 15s/120s. Asset: [fal-queue-completion](research/fal-queue-completion.md).
- [Where each path fails the robustness bar today](issues/02-moles-against-the-bar.md): Animate/export are tab-owned; brainrot needs `?jobId=` for live progress; lofi reattaches but never reconciles fal. Asset: [moles-against-the-bar](research/moles-against-the-bar.md).
- Identity, credits, states, persistence, cancel, retry, progress, reconcile, reattach, kernel, spec outline: synthesized into [Video processing kernel](spec.md).

## Not yet specified

- None that block implementation of the spec. Iterate the spec if a fifth path or a global credit-hold table (shared with chat) becomes in scope.

## Out of scope

- New infra: Inngest, QStash, a dedicated worker fleet, moving fal video onto Trigger.dev.
- Chat production / meme PNG (not fal video Runs).
- Implementing the kernel or migrating the four paths in this map (that is a later `/implement-spec`).
- Polar API / webhook plumbing.
- Forcing every client onto one transport (SSE).
- Visual UI redesign.
- A history UI of past Runs.
- Migrating chat `runs` / `creditHolds` into Video processing.
