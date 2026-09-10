# Plan 01 — Foundations & Schema

**Goal:** Add the orchestration record (`runs`) and the credit-reservation tables to the Drizzle
schema. Install the new deps and env. Nothing paid or durable can exist without these tables.

**Depends on:** nothing. **Blocks:** 02, 03, 05, 06.

---

## 1. Install deps & env

```bash
pnpm add ai @ai-sdk/openai zod @trigger.dev/sdk @trigger.dev/react-hooks
pnpm add -D @trigger.dev/build
```

Add to `shared/lib/env.ts` (server block) and `.env.example`:

```
TRIGGER_SECRET_KEY=          # server-only, from Trigger.dev project
TRIGGER_PROJECT_REF=proj_... # public-ish project ref
NEXT_PUBLIC_TRIGGER_...=      # if the react-hooks client needs a project id
```

`OPENAI_API_KEY` already exists (the `openai` SDK uses it) — reuse for `@ai-sdk/openai`.

## 2. Schema additions

File: `shared/lib/db/schema.ts` (match existing idioms: `text` PKs, `createdAt`/`updatedAt`
helpers, `jsonb`, `numeric` for money, cascade FKs).

```ts
// ── Chat harness: orchestration record ───────────────────────────────────────
export const runs = pgTable('runs', {
  id: text('id').primaryKey(),                    // == run_id, correlates everything
  userId: text('user_id').notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  storyId: text('story_id')
    .references(() => stories.id, { onDelete: 'set null' }), // the deliverable
  prompt: text('prompt').notNull(),               // original chat prompt
  pipeline: text('pipeline'),                      // stickman|cinematic|animated-explainer|…
  brief: jsonb('brief'),                           // router output: concept + params
  stage: text('stage').notNull().default('route'), // route|plan|gate|assets|compose|done|failed
  status: text('status').notNull().default('running'), // running|awaiting_approval|ok|failed|cancelled
  decisionLog: jsonb('decision_log').notNull().default('[]'), // append-only entries
  gateToken: text('gate_token'),                   // Trigger.dev wait-token id
  triggerRunId: text('trigger_run_id'),            // Trigger.dev run handle (for Realtime/cancel)
  costEstimate: integer('cost_estimate').notNull().default(0),
  costActual: integer('cost_actual').notNull().default(0),
  error: text('error'),
  createdAt,
  updatedAt,
})

// ── Credit reservation (see Plan 02 for functions) ───────────────────────────
export const creditHolds = pgTable('credit_holds', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),             // credits reserved at approval
  consumed: integer('consumed').notNull().default(0), // sum of reconciled charges
  released: boolean('released').notNull().default(false), // remainder returned?
  createdAt,
  updatedAt,
}, (t) => ({
  runIdx: uniqueIndex('credit_holds_run_uidx').on(t.runId), // one hold per run
}))

export const creditCharges = pgTable('credit_charges', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull(),             // scene id / asset key
  operation: text('operation').notNull(),          // OperationKey from credit-catalog
  credits: integer('credits').notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).notNull().default('0'),
  createdAt,
}, (t) => ({
  // Idempotency: a retried Trigger step can't double-charge the same asset.
  runAssetUidx: uniqueIndex('credit_charges_run_asset_uidx').on(t.runId, t.assetId),
}))
```

Import `boolean`, `uniqueIndex` from `drizzle-orm/pg-core` if not already imported.

## 3. Migration

```bash
pnpm drizzle-kit generate   # or your existing script
pnpm drizzle-kit migrate
```

Verify against `drizzle.config.ts` (already present). Check the generated SQL includes both unique
indexes — they are the correctness guarantee, not decoration.

## 4. Types

Add a shared `RunStage` / `RunStatus` union + a `DecisionLogEntry` type in
`shared/lib/types.ts` (or a new `features/chat/types.ts`):

```ts
export type RunStage = 'route'|'plan'|'gate'|'assets'|'compose'|'done'|'failed'
export type RunStatus = 'running'|'awaiting_approval'|'ok'|'failed'|'cancelled'

export type DecisionLogEntry = {
  category: string        // e.g. 'pipeline_selection','provider_selection','render_runtime'
  subject: string         // e.g. 'Narration TTS provider' — pair (category,subject) is the key
  choice: string
  optionsConsidered?: string[]
  rejectedBecause?: string
  costCredits?: number
  at: string              // ISO timestamp
  revised?: boolean       // set when this supersedes an earlier entry with the same pair
}
```

## Acceptance criteria

- [ ] `pnpm build` / typecheck passes with new deps.
- [ ] Migration applied; `runs`, `credit_holds`, `credit_charges` exist in the DB.
- [ ] `credit_charges` has a UNIQUE index on `(run_id, asset_id)`; `credit_holds` UNIQUE on `run_id`.
- [ ] Env vars validated by `env.ts` (build fails loudly if `TRIGGER_SECRET_KEY` missing).
