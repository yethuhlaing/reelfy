# PR7 — Upstash Redis Job Store (Bucket B)

Goal: Replace Vercel Blob-backed job state with Upstash Redis. Add storyId→jobs index for cascade ops.
Depends on: PR6 (cancel-all route uses Redis flag + set).

## Why
- Blob `jobs/{id}.json` requires `head` + `fetch` per read — slow, eventually-consistent, no atomic ops.
- No index from storyId → jobIds — can't cancel-all or delete-cascade without N+1 list+fetch.
- Cancel flag for SSE generate needs fast cross-region key (`cancel:story:{id}`).

## Provisioning (manual, user)
1. Vercel Dashboard → Storage → Marketplace → Upstash Redis → Create.
2. Link to stickman project, all envs.
3. Auto-injects `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
4. `vercel env pull .env.local` locally.

## Changes

### 1. Install
```
pnpm add @upstash/redis
```

### 2. Redis client
New file: `lib/redis.ts`
```ts
import { Redis } from '@upstash/redis'
export const redis = Redis.fromEnv()
```

### 3. Schema
- `job:{id}` → JSON string of `Job<P, R>`. `EX 86400` (24h).
- `story:{id}:jobs` → SET of jobIds. No TTL (cleared on delete-story).
- `cancel:story:{id}` → "1". `EX 3600` (1h auto-clear).

### 4. Rewrite job store
File: [lib/jobs/store.ts](lib/jobs/store.ts)

Replace all `put`/`head`/`fetch` with Redis ops:
```ts
async function writeJob(job: Job) {
  await redis.set(`job:${job.id}`, JSON.stringify(job), { ex: 86400 })
}
export async function getJob<P, R>(id: string): Promise<Job<P, R> | null> {
  const raw = await redis.get<string>(`job:${id}`)
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as Job<P, R> : null
}
export async function createJob<P>(type: JobType, payload: P & { storyId?: string }) {
  const job: Job<P> = { id: newJobId(), type, status: 'pending', payload, createdAt: Date.now(), updatedAt: Date.now() }
  await writeJob(job as Job)
  const storyId = (payload as any).storyId
  if (storyId) await redis.sadd(`story:${storyId}:jobs`, job.id)
  return job
}
```

Note: `@upstash/redis` auto-parses JSON on `.get`; handle both string + object returns.

### 5. Cancel flag helpers
File: `lib/jobs/cancel-flag.ts`
```ts
export async function setStoryCancelled(storyId: string) {
  await redis.set(`cancel:story:${storyId}`, '1', { ex: 3600 })
}
export async function isStoryCancelled(storyId: string): Promise<boolean> {
  return (await redis.get(`cancel:story:${storyId}`)) != null
}
export async function clearStoryCancelled(storyId: string) {
  await redis.del(`cancel:story:${storyId}`)
}
```

Generate loop (PR6) calls `isStoryCancelled` between scenes.
New generate flow: clear flag at start of `/api/generate` to allow re-runs.

### 6. Cancel-all route (full impl)
File: `app/api/stories/[id]/cancel/route.ts` (stubbed in PR6)
```ts
await setStoryCancelled(storyId)
const jobIds = await redis.smembers(`story:${storyId}:jobs`)
for (const id of jobIds) { /* fal.queue.cancel + markFailed */ }
```

### 7. Delete-story support helpers
Add to `lib/jobs/store.ts`:
```ts
export async function deleteJobsForStory(storyId: string) {
  const ids = await redis.smembers(`story:${storyId}:jobs`)
  if (ids.length) await redis.del(...ids.map(id => `job:${id}`))
  await redis.del(`story:${storyId}:jobs`)
}
```

## Files added
- `lib/redis.ts`
- `lib/jobs/cancel-flag.ts`

## Files modified
- `lib/jobs/store.ts` (full rewrite of persistence)
- `app/api/stories/[id]/cancel/route.ts` (replace stub)
- `app/api/generate/route.ts` (clear flag on start, check flag in loop)
- `package.json` (+ `@upstash/redis`)

## Migration
- No data migration. In-flight jobs at cutover lost — webhook idempotency (PR6) means late completions safely skip (job not found → 404 → return).
- After deploy stable: manually delete Vercel Blob `jobs/` prefix via dashboard.

## Verification
- `createJob` writes Redis + adds to set. Verify via Upstash console.
- `cancel-all` cancels all in-flight jobs for storyId, sets flag.
- Generate loop aborts mid-flight when flag set externally (curl `setStoryCancelled` while streaming).
- Latency: job read should be <50ms vs blob's ~200ms.
