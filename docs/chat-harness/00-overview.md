# Chat Harness — Implementation Plans (Index)

The **chat feature** is a general-purpose "one prompt → full video" entry point, driven by a
durable, resumable, cost-governed production harness. It sits alongside the existing category
workflows (stickman / brainrot / lofi / meme), which stay as fast one-shot presets.

**OpenMontage is the design donor, not a runtime dependency.** Its Python harness (YAML pipeline
manifests + markdown director skills + `BaseTool` contracts + JSON artifact schemas + checkpoint /
cost-tracker / reviewer) is re-expressed here as **AI SDK v6 primitives + Trigger.dev durable tasks**.
Nothing Python ships.

Artifact (visual spec): https://claude.ai/code/artifact/0d02a876-3a9f-4f86-98f5-d9df7378b8d2

---

## Locked architecture (9 decisions)

| # | Branch | Decision |
|---|--------|----------|
| 1 | Output | Full video, agent-orchestrated. Categories stay presets. |
| 2 | Agent runtime | AI SDK v6 tool loop, Next route on Fluid Compute. TS providers as tools. No Python. |
| 3 | Harness scope | Durability+resume · cost governance+gates · observability+decision log. |
| 4 | Durable backbone | **Trigger.dev** (chosen over Inngest). |
| 5 | Autonomy | Router picks pipeline → fixed durable stage graph; LLM does intelligence *within* a stage. |
| 6 | Gate | One gate after plan, before any paid asset. |
| 7 | Credits | Reserve full estimate at gate → reconcile per asset. Idempotent on `(run_id, asset_id)`. |
| 8 | Run schema | New `runs` table → links to existing `stories`/`scenes`. |
| 9 | Live channel | Trigger.dev Realtime subscription (`@trigger.dev/react-hooks`). |

## Run lifecycle

```
prompt
  → router turn (LLM: classify → pick pipeline + build brief)      [chat route, AI SDK]
  → Trigger.dev task (durable, resumable):
       plan     (generateObject → script + scene_plan, Zod-validated)   ~pennies
       ── GATE  wait.forToken(): show pipeline, concept, scenes, cost ── reserve on approve
       assets   (fan-out: TS providers as tools; reconcile per asset)    paid, idempotent
       compose  (render → writes stories/scenes; release remainder)      final settle
  → run metadata streams decision log → chat UI (Realtime)
```

---

## The plans (build in this order)

Each plan is self-contained: goal, dependencies, files, schema, steps, acceptance criteria.

| Plan | Title | Why here | Blocks |
|------|-------|----------|--------|
| [01](01-foundations-schema.md) | Foundations & schema | `runs` + credit-ledger tables; nothing paid works without the ledger. | 02,03,05,06 |
| [02](02-credit-ledger.md) | Credit reservation ledger | reserve → reconcile → release, idempotent. Money correctness. | 06,07 |
| [03](03-pipeline-registry.md) | Pipeline registry (TS) | Stage-graph configs + per-stage prompts + Zod artifact schemas. Ports OpenMontage manifests. | 04,05,06 |
| [04](04-tool-adapters.md) | Provider → tool adapters | Wrap existing TS providers as AI SDK tools with cost metadata. | 06 |
| [05](05-router-chat-route.md) | Router turn & chat route | AI SDK route: classify → pick pipeline → brief → trigger the task. | 07 |
| [06](06-trigger-task.md) | Trigger.dev durable task | The stage graph: plan → gate → assets → compose. Heart of the harness. | 07,08 |
| [07](07-gate-approval.md) | Approval gate & wait tokens | `wait.forToken()`, gate-approval API, TTL / abandonment. | 08 |
| [08](08-realtime-chat-ui.md) | Realtime chat UI | Subscribe to the run; render decision log, cost, gate prompt, result. | — |

Optional / recommended follow-ons:

| Plan | Title | Note |
|------|-------|------|
| [09](09-validation-repair.md) | Validation & auto-repair | Not selected in the grill, but recommended: bounded validate→repair per stage. |
| [10](10-observability-ops.md) | Observability & ops | Run inspector surfacing, alerting, cost dashboards, cleanup jobs. |

## New dependencies to install

```bash
pnpm add ai @ai-sdk/openai zod                 # AI SDK v6 tool loop + schemas
pnpm add @trigger.dev/sdk                       # durable tasks
pnpm add -D @trigger.dev/build                  # build extension (if needed)
pnpm add @trigger.dev/react-hooks               # Realtime subscription in the chat UI
```

Env (add to `shared/lib/env.ts` + `.env.example`): `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF`,
`OPENAI_API_KEY` (already present via `openai` SDK — reuse).

## Conventions this plan set follows

- **Reuse, don't duplicate.** Providers (`getImageProvider`, `getTextProvider`, video/music),
  credits (`credit-catalog.ts` COGS pricing), `upsertStoryWithScenes`, the story viewer, and export
  stay as-is. The harness wraps them.
- **`run_id` is the correlation key** everywhere: runs row, credit hold, charges, Trigger run,
  Realtime subscription, decision log.
- **Append-only decision log**, keyed by `(category, subject)` — mirrors OpenMontage's binding
  re-log rule. Latest entry per pair is "current".
- **Deterministic control flow.** The LLM never decides transitions or gates; the task does.
