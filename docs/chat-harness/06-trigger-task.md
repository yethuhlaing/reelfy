# Plan 06 — Trigger.dev Durable Task

**Goal:** The heart of the harness. One durable task that runs the fixed stage graph —
plan → gate → assets → compose — with crash-safe resume, per-stage schema validation, cost
reconciliation, and live decision-log streaming.

**Depends on:** 01–04. **Blocks:** 07, 08.

---

## Setup

```bash
npx trigger.dev@latest init      # creates trigger.config.ts, links project
```

`trigger.config.ts`: set `project` to `TRIGGER_PROJECT_REF`, `maxDuration` generous (the task owns
its worker; no 300s Vercel cap here), dirs pointing at `features/chat/trigger/`.

## File: `features/chat/trigger/chat-production.ts`

```ts
import { task, wait, metadata } from '@trigger.dev/sdk'
import { getPipeline } from '@/features/chat/pipelines'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { reserveForRun, releaseHold, estimateRunCredits } from '@/features/billing/server/run-credits'
import { buildTools } from '@/features/chat/tools'
import { getRun, updateRun, appendDecision } from '@/features/chat/server/runs-db'
import { upsertStoryWithScenes } from '@/features/stories/server/stories-db'

export const chatProduction = task({
  id: 'chat-production',
  maxDuration: 1800,             // 30 min ceiling for a full run
  run: async ({ runId, storyId, userId }: { runId: string; storyId: string; userId: string }) => {
    const run = await getRun(runId)
    const pipeline = getPipeline(run.pipeline)

    // ── STAGE: plan (LLM-only, cheap, resumable step) ────────────────────────
    const plan = await planStep(run, pipeline)            // metadata.set('stage','plan')
    await persistScenes(storyId, userId, pipeline, plan)  // scaffold scenes (no assets yet)

    // ── GATE: estimate → wait for human → reserve ────────────────────────────
    const estimate = estimateRunCredits(run.brief, plan)
    await updateRun(runId, { costEstimate: estimate, stage: 'gate', status: 'awaiting_approval' })
    metadata.set('gate', { estimate, plan: summarize(plan), providers: pipeline.defaults })

    const token = await wait.createToken({ timeout: '24h' })   // Plan 07 details
    await updateRun(runId, { gateToken: token.id })
    metadata.set('gateTokenId', token.id)                       // UI needs it to approve
    const gate = await wait.forToken<{ approved: boolean }>(token)

    if (!gate.ok || !gate.output.approved) {                    // timeout or rejected
      await updateRun(runId, { stage: 'failed', status: gate.ok ? 'cancelled' : 'failed' })
      return { cancelled: true }
    }

    // Reserve the full estimate atomically (Plan 02). If broke → stop cleanly.
    const res = await reserveForRun(runId, userId, estimate)
    if (!res.ok) {
      metadata.set('error', { code: 'insufficient_credits', balance: res.balance })
      await updateRun(runId, { stage: 'failed', status: 'failed', error: 'insufficient_credits' })
      return { insufficientCredits: true }
    }
    await updateRun(runId, { stage: 'assets', status: 'running' })

    // ── STAGE: assets (harness-driven fan-out; each asset idempotent) ────────
    const ctx = { runId, userId, storyId, signal: /* task abort signal */ }
    const tools = buildTools(ctx, pipeline)
    await assetsStep(plan, tools)          // mapWithConcurrency, per-asset chargeAsset + persist
                                            // completed scenes survive a retry (idempotent)

    // ── STAGE: compose (render → persist deliverable) ────────────────────────
    await updateRun(runId, { stage: 'compose' })
    const composedUrl = await tools.compose_video.execute({ storyId })
    await upsertStoryWithScenes({ /* status: 'ready', composedVideoUrl */ })

    // ── Settle: release the unused remainder of the hold ─────────────────────
    const { refunded } = await releaseHold(runId)
    const actual = estimate - refunded
    await updateRun(runId, { stage: 'done', status: 'ok', costActual: actual })
    metadata.set('done', { storyId, composedUrl, costActual: actual })
    return { storyId, composedUrl }
  },
})
```

## Why each choice

- **Steps = resume points.** Trigger checkpoints completed steps; a crash mid-`assets` resumes with
  plan + reserved hold intact, and idempotent `chargeAsset` means already-generated scenes aren't
  paid for twice. This is OpenMontage's `checkpoint.py` + `get_next_stage()`, for free.
- **Schema validation at `plan`.** `generateObject` with `scenePlanSchema` (Plan 03) — bad LLM
  output throws before any spend. (Bounded repair loop → Plan 09.)
- **`metadata.set(...)`** is the live wire to the UI (Plan 08). Push `stage`, `gate`, `decision`
  updates as they happen; the Realtime hook renders them.
- **Decision log** is written to the `runs.decisionLog` jsonb (durable) *and* mirrored to metadata
  (live). Append-only, keyed by `(category, subject)` — re-logging a changed choice appends a new
  entry with the same pair, tagged `revised` (the OpenMontage binding rule).

## `planStep` sketch

```ts
async function planStep(run, pipeline) {
  metadata.set('stage', 'plan')
  const stage = pipeline.stages.find(s => s.id === 'plan')
  const { object } = await generateObject({
    model: openai(pipeline.defaults.textModel),
    schema: stage.outputSchema,           // scenePlanSchema
    system: stage.systemPrompt, prompt: JSON.stringify(run.brief),
  })
  await appendDecision(run.id, { category: 'plan', subject: 'Scene plan', choice: `${object.scenes.length} scenes` })
  return object
}
```

## Env inside the worker

Provider SDKs (fal, openai, google) + DB run **inside the Trigger.dev worker**, not the Next
runtime. Ensure all provider + `DATABASE_URL` + fal/openai keys are set in the Trigger.dev project
env. Verify DB connection pooling behaves in the worker (postgres-js `max` may need tuning per
worker concurrency).

## Acceptance criteria

- [ ] A full run completes plan → gate → assets → compose and persists a playable `composedVideoUrl`.
- [ ] Killing the worker mid-`assets` and letting Trigger retry resumes without re-charging done scenes.
- [ ] `plan` output is schema-valid or the run fails *before* the gate (no spend on garbage plans).
- [ ] `costActual == estimate - refunded`; balance reconciles exactly.
- [ ] `metadata` reflects the current stage at every transition.
