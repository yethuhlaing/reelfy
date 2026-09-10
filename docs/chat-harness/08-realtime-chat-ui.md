# Plan 08 — Realtime Chat UI

**Goal:** The chat surface. Subscribe to the run via Trigger.dev Realtime, render the live decision
log, stage progress, cost estimate, the approval gate, and the final video. Survives reloads by
re-subscribing on `run_id`.

**Depends on:** 05, 06, 07. **Blocks:** —

---

## Channel

`@trigger.dev/react-hooks` `useRealtimeRun` (or `useRealtimeRunWithStreams`) subscribes to a
Trigger run using the **scoped public access token** minted in Plan 05. Metadata pushed by the task
(`metadata.set(...)`) arrives live. No SSE route to maintain; the connection is to Trigger, not to a
Vercel function under the timeout cap.

## Enable the send button

`features/dashboard/components/ai-chat.tsx` — the send button is currently `disabled`. Wire it:

```tsx
async function onSend() {
  const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt: message }) })
  const { runId, triggerRunId, publicAccessToken } = await res.json()
  router.push(`/dashboard/run/${runId}?t=${triggerRunId}`)   // or render inline
  // stash publicAccessToken (sessionStorage or a run context) for the subscriber
}
```

Keep the template cards (fast presets) exactly as they are.

## Run view

`app/dashboard/run/[runId]/page.tsx` + a client `RunStream` component:

```tsx
'use client'
import { useRealtimeRun } from '@trigger.dev/react-hooks'

export function RunStream({ triggerRunId, publicAccessToken }) {
  const { run } = useRealtimeRun(triggerRunId, { accessToken: publicAccessToken })
  const m = run?.metadata ?? {}

  return (
    <div>
      <StageRail stage={m.stage} />                      {/* plan → assets → compose */}
      <DecisionLog entries={m.decisionLog ?? []} />      {/* live provider/cost decisions */}
      {m.gate && <GatePanel runId={runId} {...m.gate} />} {/* approve/reject */}
      {m.done && <VideoResult {...m.done} />}            {/* embed composedUrl */}
      {m.error && <ErrorPanel {...m.error} />}
    </div>
  )
}
```

## The gate panel

```tsx
function GatePanel({ runId, estimate, plan, providers }) {
  const approve = (approved: boolean) =>
    fetch(`/api/chat/${runId}/gate`, { method: 'POST', body: JSON.stringify({ approved }) })
  return (
    <div className="gate">
      <h3>Ready to generate — {estimate} credits</h3>
      <SceneList scenes={plan.scenes} />
      <ProviderPlan providers={providers} />
      <button onClick={() => approve(true)}>Approve &amp; generate</button>
      <button onClick={() => approve(false)}>Cancel</button>
    </div>
  )
}
```

Match the existing design tokens (`--surface`, `--border`, etc. — see `ai-chat.tsx`). Reuse the
stage-rail visual language you already stream in `/api/generate` (`type:'stage'` events) so the
chat run feels consistent with category generation.

## Reload / resume

- The `triggerRunId` + a fresh public token can be re-fetched from `GET /api/chat/[runId]` (returns
  run row + a new scoped token). On mount, if no token in memory, fetch it → re-subscribe. The run
  keeps executing server-side regardless; the UI just re-attaches.
- If the run is already `done` on load, render the final video from the `stories` row directly (no
  subscription needed) — reuse the existing story viewer.

## Decision log rendering

Render `decisionLog` grouped by `(category, subject)`, showing the **latest** entry per pair as
current (tag `revised` ones). This mirrors the OpenMontage board semantics and gives users the
"why this provider / this cost" audit trail live.

## Acceptance criteria

- [ ] Typing a prompt + send starts a run and shows live stage progress within a second or two.
- [ ] The gate panel appears when the run pauses; approve resumes, cancel stops.
- [ ] Reloading mid-run re-attaches and keeps streaming; a finished run shows the video.
- [ ] Decision log shows provider + credit cost per asset as they complete.
- [ ] Public token is run-scoped (can't read other users' runs).
