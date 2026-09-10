# Plan 05 — Router Turn & Chat Route

**Goal:** The chat entry point. An AI SDK route that (1) classifies the prompt, (2) picks a pipeline
and drafts a brief, (3) creates the `runs` row + a `stories` stub, (4) triggers the durable task,
(5) returns the `run_id` so the UI can subscribe (Plan 08).

**Depends on:** 01, 02, 03. **Blocks:** 07.

---

## Where it lives

`app/api/chat/route.ts` — `runtime = 'nodejs'`, on Fluid Compute. This route is **short**: the
router turn is cheap (LLM classify + brief, ~pennies) and then it hands off to Trigger.dev. It does
**not** run generation; it returns fast.

## Flow

```ts
export const runtime = 'nodejs'
export const maxDuration = 60   // router turn only; the task does the long work

export async function POST(req: Request) {
  const session = await requireUserSession(req)
  if (isAuthError(session)) return session
  const { prompt } = await req.json()

  // 1. Router turn — classify + pick pipeline + draft brief
  const brief = await routePrompt(prompt)      // generateObject, briefSchema (Plan 03)

  // 2. Create the run + a story stub (reuse upsertStoryWithScenes with empty scenes)
  const runId = newId(); const storyId = newId()
  await createRun({ runId, storyId, userId: session.user.id, prompt, brief })
  await upsertStoryWithScenes({ storyId, userId: session.user.id,
    category: getPipeline(brief.pipeline).storyCategory, storyInput: prompt,
    options: {/* from brief.defaults */}, storyData: emptyStory(brief), status: 'generating' })

  // 3. Log the pipeline choice as the first decision-log entry
  await appendDecision(runId, {
    category: 'pipeline_selection', subject: 'Production pipeline',
    choice: brief.pipeline, optionsConsidered: pipelineCatalog().map(p => p.id),
  })

  // 4. Trigger the durable task (Plan 06). Store the handle for Realtime + cancel.
  const handle = await tasks.trigger('chat-production', { runId, storyId, userId: session.user.id })
  await updateRun(runId, { triggerRunId: handle.id, stage: 'plan' })

  // 5. Return run id + a public access token scoped to this run (Plan 08 subscribes with it)
  const publicToken = await auth.createPublicToken({ scopes: { read: { runs: [handle.id] } } })
  return Response.json({ runId, triggerRunId: handle.id, publicAccessToken: publicToken })
}
```

## The router turn

```ts
// features/chat/server/router.ts
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { briefSchema } from '@/features/chat/pipelines/schemas'
import { pipelineCatalog } from '@/features/chat/pipelines'

export async function routePrompt(prompt: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: briefSchema,
    system: `You route a user's video request to ONE production pipeline and draft a brief.
      Available pipelines:\n${pipelineCatalog().map(p => `- ${p.id}: ${p.description}`).join('\n')}
      Choose the best-fit pipeline. Draft a concept, title, format, duration, and visual approach.
      Do NOT invent capabilities outside the listed pipelines.`,
    prompt,
  })
  return object
}
```

## Guardrails

- **Pipeline whitelist:** the router can only return an id in `pipelineCatalog()`. Validate the
  returned `brief.pipeline` against the registry; if invalid, re-ask once, then fall back to a safe
  default (`cinematic`) and note it in the decision log.
- **No spend here.** The router is LLM-only. Reservation happens later, at the gate (Plan 07).
- **Rate limit** by user (you already have `rateLimit` table + Upstash) so a spammed prompt box
  can't create unbounded runs/stubs.
- **Ambiguous prompt:** if the model's `concept` confidence is low or the prompt is empty, return a
  clarifying question instead of creating a run (optional; MVP can just pick a default).

## Wiring the existing chat UI

`features/dashboard/components/ai-chat.tsx` currently has the **send button disabled** and only
routes to a category. Enable send → `POST /api/chat` → on `{runId, publicAccessToken}`, navigate to
the run view (Plan 08) and subscribe. Keep the category template cards as the fast-preset path
(unchanged).

## Acceptance criteria

- [ ] `POST /api/chat` with a prompt returns `{ runId, triggerRunId, publicAccessToken }` in < a few s.
- [ ] A `runs` row + a `stories` stub exist after the call; `stage='plan'`, `status='running'`.
- [ ] Decision log has the `pipeline_selection` entry.
- [ ] Router only ever returns a whitelisted pipeline id; invalid → fallback logged.
- [ ] The route spends **zero** credits.
