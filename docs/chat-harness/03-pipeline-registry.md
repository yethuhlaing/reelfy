# Plan 03 — Pipeline Registry (TS)

**Goal:** Port OpenMontage's YAML pipeline manifests + markdown director skills into TypeScript
stage-graph configs, per-stage system prompts, and Zod artifact schemas. This is the harness's
"instruction layer," re-expressed as code.

**Depends on:** 01. **Blocks:** 04, 05, 06.

---

## Mapping from the donor

| OpenMontage | Here |
|---|---|
| `pipeline_defs/<pipeline>.yaml` | a `Pipeline` object: ordered `stages[]`, allowed tools, gate policy |
| `skills/pipelines/<pipeline>/<stage>-director.md` | `stage.systemPrompt` string (per stage) |
| `schemas/artifacts/*.json` | Zod schemas per artifact (`brief`, `script`, `scenePlan`, …) |
| `human_approval_default` per stage | `stage.gate: 'before' | 'none'` |

**Don't port all pipelines.** Start with the ones that map cleanly onto providers you already have
(image / video / music / text). Recommended launch set: **`cinematic`** and **`animated-explainer`**
(both are still/image-led → your fal FLUX + LTX providers cover them). Add `talking-head` /
character / lofi-style later.

## File layout

```
features/chat/pipelines/
  index.ts                 # registry: id → Pipeline; getPipeline(id)
  types.ts                 # Pipeline, Stage, ArtifactSchemas
  schemas.ts               # Zod: briefSchema, scriptSchema, scenePlanSchema
  cinematic.ts             # Pipeline def + per-stage prompts
  animated-explainer.ts
  prompts/                 # (optional) long prompts as separate .ts string exports
```

## Types

```ts
// features/chat/pipelines/types.ts
import type { z } from 'zod'

export type StageId = 'plan' | 'assets' | 'compose'

export type Stage = {
  id: StageId
  /** The AI SDK system prompt — the ported director skill. */
  systemPrompt: string
  /** Artifact this stage produces, validated with generateObject. */
  outputSchema?: z.ZodTypeAny
  /** Approval policy. Only one gate in the launch design: before 'assets'. */
  gate: 'before' | 'none'
  /** Tools this stage may call (Plan 04 ids). Empty for LLM-only stages. */
  tools: string[]
}

export type Pipeline = {
  id: string                 // 'cinematic'
  label: string
  description: string
  /** Which output category this maps to for stories/scenes persistence. */
  storyCategory: string      // reuse 'stickman' style category tag or a new one
  stages: Stage[]            // ordered: plan → assets → compose
  /** Providers/models this pipeline defaults to (surfaced in the brief + decision log). */
  defaults: {
    textModel: string; imageModel: string; videoModel?: string; musicModel?: string
  }
}
```

## Zod artifact schemas (the step boundaries)

```ts
// features/chat/pipelines/schemas.ts
import { z } from 'zod'

export const briefSchema = z.object({
  pipeline: z.string(),
  concept: z.string(),           // one-paragraph creative direction
  title: z.string(),
  format: z.enum(['narrative','explainer','listicle']).default('narrative'),
  durationSec: z.number().int().min(15).max(180),
  visualApproach: z.string(),
})

export const sceneSchema = z.object({
  id: z.string(),
  sentence: z.string(),
  voiceoverText: z.string(),
  imagePrompt: z.string(),
  motionPrompt: z.string().optional(),
  action: z.string(), setting: z.string(), emotion: z.string(),
})

export const scenePlanSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  protagonist: z.string(),
  thumbnailPrompt: z.string(),
  scenes: z.array(sceneSchema).min(3).max(20),
})

export type Brief = z.infer<typeof briefSchema>
export type ScenePlan = z.infer<typeof scenePlanSchema>
```

> These deliberately match the shape `upsertStoryWithScenes` already consumes, so `compose` can
> persist through the existing path with minimal translation.

## A pipeline definition

```ts
// features/chat/pipelines/cinematic.ts
import type { Pipeline } from './types'
import { scenePlanSchema } from './schemas'

export const cinematic: Pipeline = {
  id: 'cinematic',
  label: 'Cinematic',
  description: 'Image-led cinematic short with narration and score.',
  storyCategory: 'cinematic',
  defaults: { textModel: 'gpt-4o-mini', imageModel: 'flux-dev-fal', videoModel: 'ltx-video-fal', musicModel: 'stable-audio-fal' },
  stages: [
    {
      id: 'plan',
      gate: 'none',
      tools: [],
      outputSchema: scenePlanSchema,
      systemPrompt: `You are the plan director for a cinematic short. Given the brief,
        write a scene-by-scene plan: vivid image prompts (cinematic lighting, lens,
        composition), narration per scene, and motion prompts. Keep to the target
        duration. Output must satisfy the scenePlan schema exactly.`,
    },
    {
      id: 'assets',
      gate: 'before',                 // THE gate — before any paid generation
      tools: ['generate_image','generate_video','generate_music','generate_voice'],
      systemPrompt: `Generate assets for each planned scene using the provided tools.
        Announce provider/model per the decision contract before batches. Prefer the
        pipeline defaults unless the brief demands otherwise.`,
    },
    {
      id: 'compose',
      gate: 'none',
      tools: ['compose_video'],
      systemPrompt: `Assemble the final video from generated assets and persist it.`,
    },
  ],
}
```

## Registry

```ts
// features/chat/pipelines/index.ts
import { cinematic } from './cinematic'
import { animatedExplainer } from './animated-explainer'
const ALL = [cinematic, animatedExplainer] as const
export const PIPELINES = Object.fromEntries(ALL.map(p => [p.id, p]))
export function getPipeline(id: string) { return PIPELINES[id] }
export function pipelineCatalog() {  // for the router prompt
  return ALL.map(p => ({ id: p.id, label: p.label, description: p.description }))
}
```

## Acceptance criteria

- [ ] `getPipeline('cinematic').stages` is ordered plan → assets → compose with the gate on `assets`.
- [ ] `scenePlanSchema.parse(...)` accepts a hand-written valid plan and rejects a missing-field one.
- [ ] `pipelineCatalog()` returns exactly the launch pipelines (fed to the router in Plan 05).
- [ ] Every stage's `tools[]` references only tool ids defined in Plan 04.
