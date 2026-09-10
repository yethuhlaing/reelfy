# Plan 10 — Observability & Ops

**Goal:** Operate the harness in production: surface run health, reconcile money, clean up abandoned
runs, and alert on failures. You get a lot free from Trigger.dev's dashboard; this plan covers what
you must add on your side.

**Depends on:** 06, 07. **Blocks:** —

---

## Free from Trigger.dev

- **Run inspector:** every run, step, retry, payload, log, duration — in the Trigger dashboard.
- **Realtime metadata:** already streamed to the user (Plan 08).
- **Retries + replay:** built in; failed runs are inspectable and replayable.

Don't rebuild these. Link ops to the Trigger dashboard for step-level debugging.

## What you must add

### 1. Money reconciliation

The credit ledger (Plan 02) is the source of truth for spend. Add a periodic check:

- **Orphaned holds:** `credit_holds` where `released = false` and the run is `done`/`failed`/
  `cancelled` older than N minutes → call `releaseHold` (should be rare; means the task died after
  `assets` but before settle). A scheduled Trigger task or cron.
- **Overage log:** rows where `consumed > amount` (real cost beat the estimate) → alert; feed back
  into `credit-catalog` margins or the estimator. This is your pricing-drift signal.
- **Charge/story parity:** `credit_charges` for a run should match the assets persisted on its
  story. Mismatch → generation succeeded but persist failed (or vice-versa).

### 2. Abandoned-run sweeper

Scheduled task: `awaiting_approval` runs past the gate TTL → mark `cancelled`. (Plan 07 — the task's
own `wait` timeout usually handles this; the sweeper is the backstop for missed timeouts.)

```ts
// features/chat/trigger/sweep-abandoned.ts
export const sweepAbandoned = schedules.task({
  id: 'sweep-abandoned-runs', cron: '*/30 * * * *',
  run: async () => {
    const stale = await findRuns({ status: 'awaiting_approval', olderThan: '24h' })
    for (const r of stale) { await cancelRun(r.id); /* no hold to release pre-approval */ }
  },
})
```

### 3. Failure alerting

- Trigger's `onFailure` / `catchError` hooks on `chat-production` → post to your alert channel
  (Slack webhook / Sentry) with `runId`, stage, error. Distinguish **auth/provider** errors
  (actionable: key expired, provider down) from **quality** errors (bad plan) — the OpenMontage
  "escalate blockers" taxonomy.
- Track a **failure rate by stage** and **by pipeline** — if `assets` fails disproportionately on
  one provider, that's a provider-health signal.

### 4. Usage metering (reuse existing)

You already have `fireAndForgetUsage` + `apiUsageEvents` + `apiCostLogs`. Emit the same meters from
the tool adapters (Plan 04) so chat-run spend shows up in the same billing/usage views as category
generation. One meter surface, not two.

### 5. Cost dashboard (optional)

Per-run: estimate vs actual, per-provider spend, refund rate. Sourced entirely from
`runs` + `credit_charges` + `credit_holds`. A simple internal admin page (you have
`features/admin/`).

## Acceptance criteria

- [ ] No `credit_holds` stay unreleased after a run reaches a terminal state.
- [ ] Abandoned `awaiting_approval` runs are cleaned within one sweep interval.
- [ ] A run failure posts an alert tagged with stage + error class.
- [ ] Chat-run spend appears in the existing usage/billing views alongside category spend.
- [ ] `consumed > amount` overages are logged for repricing.
