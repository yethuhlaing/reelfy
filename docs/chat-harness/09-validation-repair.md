# Plan 09 — Validation & Auto-Repair (recommended, not in the locked scope)

**Goal:** Make every LLM stage output schema-valid before it's used, with a bounded repair loop.
Not selected during the grill, but **strongly recommended**: durable multi-stage handoffs are only
as safe as the artifacts passed between stages. This is OpenMontage's `reviewer.md` (advisory,
max 2 rounds), re-expressed.

**Depends on:** 03, 06. **Blocks:** —

---

## Why bother

`generateObject` already enforces *shape* (Zod). It does **not** enforce *quality*: a plan can be
schema-valid but have 20 identical scene prompts, empty narration, or a duration that doesn't match
the brief. Garbage that passes Zod still costs real credits downstream. A cheap review pass at the
`plan` boundary catches it before the gate — where it's still free to fix.

## Two layers

**1. Structural repair (automatic, tight loop).** If `generateObject` throws a schema error, retry
up to 2× feeding the error back into the prompt:

```ts
async function generateValidated(schema, system, prompt, model, maxRounds = 2) {
  let lastErr
  for (let i = 0; i <= maxRounds; i++) {
    try { return (await generateObject({ model, schema, system, prompt })).object }
    catch (e) {
      lastErr = e
      prompt += `\n\nYour previous output failed validation: ${String(e)}. Fix it.`
    }
  }
  throw lastErr   // fail the run before the gate — no spend
}
```

**2. Semantic review (advisory, cheap LLM critique).** After a valid plan, one small critique call:

```ts
const review = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: z.object({ pass: z.boolean(), issues: z.array(z.string()), fixHint: z.string().optional() }),
  system: `Review this scene plan against the brief. Flag: duplicate/near-duplicate image prompts,
    empty or filler narration, scene count vs target duration mismatch, off-brief tone. Be strict
    but terse.`,
  prompt: JSON.stringify({ brief, plan }),
})
if (!review.pass && rounds < 2) { /* regenerate plan with review.fixHint, re-review */ }
```

Cap at **2 rounds** (the OpenMontage rule). Review is advisory — never blocks indefinitely; after 2
rounds, proceed with the best plan and log the residual issues to the decision log so the user sees
them at the gate.

## Where it runs

Inside `planStep` (Plan 06), before setting the gate metadata. Both layers are LLM-only and cheap,
so they run *before* any reservation. Optionally add a lighter structural-repair pass at `compose`
if that stage produces structured output.

## Cost note

Review adds a couple of small LLM calls per run (~pennies). Cheap insurance against spending real
image/video credits on a bad plan. Gate it behind a pipeline flag (`pipeline.review: true`) if you
want it only on hero pipelines.

## Acceptance criteria

- [ ] A schema-invalid plan is auto-repaired within 2 rounds or fails the run pre-gate (no spend).
- [ ] A plan with duplicate prompts is flagged; either fixed or surfaced at the gate.
- [ ] Review never exceeds 2 rounds; residual issues appear in the decision log.
- [ ] Review can be toggled per pipeline.
