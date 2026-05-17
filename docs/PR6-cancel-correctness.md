# PR6 — Cancel Correctness (Bucket C)

Goal: rigid workflow. Every long-running op cancellable. Webhook idempotent.
Depends on: none (lands first).

## Why
- `fal.queue.cancel` is best-effort — fal docs: IN_PROGRESS may still complete, webhook may still fire (retries 10×/2h).
- Current animate/compose webhook ignores `job.status` → late completion writes blob + overwrites `failed` → cancel undone.
- `/api/generate` has no abort path. Client disconnect doesn't stop `Promise.all` over scenes. Wasted FAL credits.
- `/api/voiceover` has no abort path.

## Changes

### 1. Webhook idempotency
Files: [app/api/webhooks/fal/animate/[jobId]/route.ts](app/api/webhooks/fal/animate/[jobId]/route.ts), [app/api/webhooks/fal/compose/[jobId]/route.ts](app/api/webhooks/fal/compose/[jobId]/route.ts)

After `getJob`, before any `put` or `markCompleted`:
```ts
if (job.status === 'failed' || job.status === 'completed') {
  return new Response('ok')
}
```
Reason: fal retries up to 10× / 2h. Cancelled + already-completed must short-circuit.

### 2. Generate SSE cancel
File: [app/api/generate/route.ts](app/api/generate/route.ts)

- Accept `request.signal` from Route Handler signature.
- Per-scene loop: `if (request.signal.aborted) throw new DOMException('aborted', 'AbortError')`.
- Pass `signal` into image providers (`lib/providers/image-*.ts`) — add optional `signal?: AbortSignal` to `ImageProvider.generate`. Forward to `fetch`.
- Replace `Promise.all` with `Promise.allSettled` + signal-aware wrappers so one cancel stops all in-flight fetches.
- Stream `{ type: 'cancelled' }` event before closing controller.

Files touched:
- `lib/providers/image.ts` — type update.
- `lib/providers/image-fal-*.ts` — accept + forward signal to fal SDK (`fal.subscribe(..., { signal })` if supported; else wrap in `AbortController` race).
- `lib/providers/text-gemini.ts` — same signal plumb for plan call.

### 3. Voiceover cancel
Files: [app/api/voiceover/route.ts](app/api/voiceover/route.ts), [lib/elevenlabs.ts](lib/elevenlabs.ts)

- Pass `request.signal` into elevenlabs `fetch`.
- On abort: return 499 (client closed) without `put`.

### 4. Client AbortControllers
File: [app/page.tsx](app/page.tsx)

- One `AbortController` per workflow held in refs: `generateAbortRef`, `voiceoverAbortRef`, `composeAbortRef`.
- Pass `signal` to every `fetch` in those flows + readSSE.
- New handlers: `handleCancelGenerate`, `handleCancelVoiceover`, `handleCancelCompose` → `.abort()` + POST `/api/jobs/{id}/cancel` for queue jobs.

### 5. Per-story cancel-all
New file: `app/api/stories/[id]/cancel/route.ts`

- POST handler.
- Set Redis flag `cancel:story:{id}` = "1" with `EX 3600` (depends on PR7 — stub for now using blob if Redis not yet live, else gate this part to PR7).
- Read jobIds: from request body for now (`{ jobIds: string[] }`). After PR7: `SMEMBERS story:{id}:jobs`.
- For each jobId: call existing cancel route logic (mark failed + fal.queue.cancel).

### 6. UI cancel surface
Files: [app/page.tsx](app/page.tsx), `components/StageList.tsx`, `components/ExportButton.tsx`, `components/VoiceoverBar.tsx`

- Cancel button next to active stage in `StageList` (generate).
- Cancel button on compose progress + voiceover progress.
- Global "Stop story" button in panel header (calls cancel-all).

## Files added
- `app/api/stories/[id]/cancel/route.ts`

## Files modified
- `app/api/webhooks/fal/animate/[jobId]/route.ts`
- `app/api/webhooks/fal/compose/[jobId]/route.ts`
- `app/api/generate/route.ts`
- `app/api/voiceover/route.ts`
- `lib/elevenlabs.ts`
- `lib/providers/image.ts` + each `image-fal-*.ts`
- `lib/providers/text-gemini.ts`
- `app/page.tsx`
- `components/StageList.tsx`
- `components/ExportButton.tsx`
- `components/VoiceoverBar.tsx`

## Verification
- Cancel generate mid-stream → no further `put` to `scenes/`, FAL credits stop, SSE closes cleanly with `cancelled` event.
- Cancel animate → fal.queue.cancel called → webhook arrives later → sees `status='failed'` → returns ok, no `put` to `animations/`.
- Voiceover cancel → ElevenLabs fetch aborts, no blob written.
- Webhook replayed manually (curl with same payload) → idempotent, single `markCompleted`.
