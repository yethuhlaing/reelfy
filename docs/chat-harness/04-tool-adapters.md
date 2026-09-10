# Plan 04 — Provider → Tool Adapters

**Goal:** Wrap the existing TS providers (`getImageProvider`, `getTextProvider`, video, music) as
AI SDK v6 tools with cost metadata, so the `assets` stage can call them, and every call reconciles
against the credit hold and appends to the decision log.

**Depends on:** 01, 02, 03. **Blocks:** 06.

---

## Principle

The providers already exist and already work (`app/api/generate/route.ts` uses
`imageProvider.generate(...)` with a `costContext`). **Don't rewrite them.** A tool adapter is a
thin AI SDK `tool()` that:

1. calls the existing provider,
2. calls `chargeAsset(...)` (Plan 02) with the run id + a stable asset id → idempotent cost,
3. appends a `provider_selection` entry to the run's decision log,
4. returns a compact result to the LLM (URL + id, not raw bytes).

The **run context** (`runId`, `userId`, `storyId`, `signal`) is injected via closure when the tools
are built per-run — not passed by the model.

## File: `features/chat/tools/index.ts` (new)

```ts
import { tool } from 'ai'
import { z } from 'zod'
import { getImageProvider } from '@/shared/lib/providers/image/image'
import { getVideoProvider } from '@/shared/lib/providers/video/video'
import { getMusicProvider } from '@/shared/lib/providers/audio/music'
import { chargeAsset } from '@/features/billing/server/run-credits'
import { appendDecision } from '@/features/chat/server/decision-log' // Plan 06 helper
import { completeSceneImage } from '@/features/stories/server/story-assets'

export type RunContext = {
  runId: string; userId: string; storyId: string; signal: AbortSignal
}

export function buildTools(ctx: RunContext, pipeline) {
  const image = getImageProvider(pipeline.defaults.imageModel)

  const generate_image = tool({
    description: 'Generate one scene image from a prompt.',
    inputSchema: z.object({ sceneId: z.string(), prompt: z.string(), aspectRatio: z.string().default('16:9') }),
    execute: async ({ sceneId, prompt, aspectRatio }) => {
      const { mimeType, data, costUsd } = await image.generate(prompt, {
        aspectRatio, signal: ctx.signal,
        costContext: { userId: ctx.userId, storyId: ctx.storyId, sceneId, operation: 'scene_image' },
      })
      // idempotent reconcile against the hold
      const charge = await chargeAsset({ runId: ctx.runId, assetId: sceneId, operation: 'scene_image', costUsd: costUsd ?? 0 })
      const imageUrl = await completeSceneImage({ storyId: ctx.storyId, sceneId, userId: ctx.userId, data, mimeType })
      await appendDecision(ctx.runId, {
        category: 'provider_selection', subject: `Image · ${sceneId}`,
        choice: image.id, costCredits: charge.charged,
      })
      return { sceneId, imageUrl }
    },
  })

  // generate_video, generate_music, generate_voice: same shape, different provider + operation
  // compose_video: calls the existing compose/export path, persists composedVideoUrl on the story

  const catalog = { generate_image /*, …*/ }
  // Expose only the tools the current stage allows:
  return catalog
}
```

## Cost surfacing

`costUsd` must come back from each provider call so `chargeAsset` can price it with
`creditsForOperation`. Check each provider's return type: some already return cost via `costContext`
side-effects (see `apiCostLogs` / `cost-logger.ts`); if a provider doesn't return `costUsd`, look it
up from `VISUAL_PRICING` / `credit-catalog` by model id instead. Either way the credit number is
derived, never hardcoded.

## Concurrency (fan-out)

The `assets` stage generates many images. Two options:

- **LLM-driven:** let the model call `generate_image` per scene in a tool loop
  (`stopWhen: stepCountIs(N)`). Simple, but token-heavy and the model paces it.
- **Harness-driven (recommended):** the stage handler calls the tools' `execute` **directly** in a
  bounded `mapWithConcurrency` (reuse the exact helper from `app/api/generate/route.ts`, cap 4,
  90s per-image timeout), *not* through the LLM loop. The LLM produced the plan; the harness runs
  the batch. Deterministic, cheap, resumable — completed scenes are already persisted + charged,
  so a Trigger retry skips them (idempotent `chargeAsset`).

Recommend harness-driven for `assets`; reserve the LLM tool loop for stages that genuinely need
model judgment mid-generation.

## Abort / timeout

Thread `ctx.signal` into every provider call (providers already accept `signal`). Reuse the
`withTimeout` wrapper from `app/api/generate/route.ts` so one hung fal call can't stall the batch.

## Acceptance criteria

- [ ] Each tool calls the existing provider unchanged (no provider rewrites).
- [ ] Every successful asset produces exactly one `credit_charges` row; a re-run adds none.
- [ ] Each asset appends a `provider_selection` decision-log entry with the real credit cost.
- [ ] `assets` fan-out honors concurrency cap + per-asset timeout; abort cancels in-flight calls.
