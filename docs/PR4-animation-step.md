# PR 4 — Animation Step (Image-to-Video)

## Goal
"Animate All" button below the scene grid triggers per-scene image-to-video generation via Fal.ai (default LTX-Video). Each scene gets a 5s silent MP4 stored in Vercel Blob. Cards swap from `<img>` to `<video>` during playback.

## Depends on
PR 1 (Blob + persistence + storyId pattern).
PR 2 (provider abstraction pattern — mirrored here for video providers).

## User-visible outcomes
- New "Animate All" button next to "Play All" in panel header.
- Click → SSE progress (4 scenes in parallel, ~60-90s for 10 scenes).
- Per-card spinner overlay while that scene animates.
- On success: card image stays as thumbnail; clicking play swaps to `<video>` playback.
- Re-clicking "Animate All" skips already-animated scenes (idempotent).
- Persisted across refresh.

## Cost
LTX-Video default: ~$0.025/5s clip × 10 = ~$0.25/story animation.

---

## Dependencies
Reuses `@fal-ai/client` from PR 2.

## Env
```
VIDEO_MODEL=ltx-video-fal              # default
# alternates:
# VIDEO_MODEL=kling-1.6-std-fal
# VIDEO_MODEL=svd-fal
```

---

## File changes

### `lib/types.ts`
```ts
export interface ScenePlan {
  // ...existing...
  motionPrompt: string             // NEW — 1-2 sentences describing motion
}

export interface Scene extends ScenePlan {
  imageUrl: string | null
  voiceoverUrl: string | null      // from PR 1
  videoUrl: string | null          // NEW — 5s I2V mp4 in Blob
}

export type StreamEvent =
  // ...existing...
  | { type: 'scene-video'; sceneId: string; videoUrl: string }     // NEW
  | { type: 'scene-video-error'; sceneId: string; error: string }  // NEW
  | { type: 'video-progress'; done: number; total: number }        // NEW
```

### `lib/gemini.ts` (CHANGE — schema extension)
Add `motionPrompt` field to scene JSON schema:
```
"motionPrompt": string          // 1-2 sentences, motion only, see MOTION RULES
```

Add `MOTION RULES` block to buildPlanPrompt:
```
============================================================
MOTION PROMPT — REQUIRED CONTENT (1-2 short sentences):

Each scene's motionPrompt describes what should ANIMATE in the static frame.
Hard rules:
- Only animate: arms, head, facial expression, hands, OR props (e.g. pen writing, phone ringing, smoke rising).
- Body position remains mostly static — character does not walk across the frame.
- Movements are slow, natural, minimal — no whip pans, no morphing, no scene cuts.
- Match the scene.emotion (triumph = arms raise; frustration = head shakes; despair = shoulders slump further; etc.).
- DO NOT describe the static composition — that's already in the frame.

Example: "Stickman slowly raises right arm in triumph. Head tilts back slightly. Sunburst pulses behind him. Body stays planted."
```

### `lib/providers/video.ts` (NEW)
Mirrors the image provider adapter shape.
```ts
export interface VideoProvider {
  id: string
  costEstimateUsd: number
  generate(input: VideoInput): Promise<{ mimeType: string; data: Buffer }>
}

export interface VideoInput {
  imageUrl: string                 // public URL fetchable by Fal
  motionPrompt: string
  durationSec: 5                   // fixed for MVP (Q9)
  aspectRatio: '16:9'
}

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  'ltx-video-fal':       ltxVideoFal,
  'kling-1.6-std-fal':   kling16StdFal,
  'svd-fal':             svdFal,
}

export function getVideoProvider(id?: string): VideoProvider {
  const key = id ?? process.env.VIDEO_MODEL ?? 'ltx-video-fal'
  return VIDEO_PROVIDERS[key] ?? VIDEO_PROVIDERS['ltx-video-fal']
}
```

### `lib/providers/video-fal-ltx.ts` (NEW)
```ts
import { fal } from './fal'
import type { VideoProvider } from './video'

export const ltxVideoFal: VideoProvider = {
  id: 'ltx-video-fal',
  costEstimateUsd: 0.025,
  async generate({ imageUrl, motionPrompt }) {
    const result = await fal.subscribe('fal-ai/ltx-video', {
      input: {
        image_url: imageUrl,
        prompt: motionPrompt,
        num_inference_steps: 30,
      },
      logs: false,
    })
    const url = (result.data as any).video.url
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    return { mimeType: 'video/mp4', data: buf }
  },
}
```

### `lib/providers/video-fal-kling.ts` (NEW)
Same shape using `fal-ai/kling-video/v1-6/standard/image-to-video`. Takes `duration: '5'` parameter.

### `lib/providers/video-fal-svd.ts` (NEW)
Same shape using `fal-ai/stable-video-diffusion`. Ignores `motionPrompt` (SVD has no text input).

### `app/api/animate/route.ts` (NEW)
SSE endpoint. POST `{ storyId, scenes: Scene[] }` (client sends current scene list so server stays stateless).

```ts
import { put } from '@vercel/blob'
import { getVideoProvider } from '@/lib/providers/video'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const { storyId, scenes } = await request.json()
  const provider = getVideoProvider()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))

      const todo = scenes.filter((s: Scene) => !s.videoUrl && s.imageUrl)
      const total = todo.length
      let done = 0

      send({ type: 'stage', id: 'animate', status: 'active', detail: `${total} scenes` })

      await withLimit(todo, 4, async (scene: Scene) => {
        try {
          const { mimeType, data } = await withRetry(
            () => provider.generate({
              imageUrl: scene.imageUrl!,
              motionPrompt: scene.motionPrompt,
              durationSec: 5,
              aspectRatio: '16:9',
            }),
            { retries: 2, backoffMs: [1000, 3000] }
          )
          const { url } = await put(
            `videos/${storyId}/${scene.id}.mp4`,
            data,
            { access: 'public', contentType: mimeType, addRandomSuffix: false, allowOverwrite: true }
          )
          send({ type: 'scene-video', sceneId: scene.id, videoUrl: url })
        } catch (e: any) {
          send({ type: 'scene-video-error', sceneId: scene.id, error: e.message })
        } finally {
          done++
          send({ type: 'video-progress', done, total })
        }
      })

      send({ type: 'stage', id: 'animate', status: 'done' })
      send({ type: 'complete' })
      controller.close()
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}

// Helpers
async function withLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items]
  const workers = Array(limit).fill(0).map(async () => {
    while (queue.length) await fn(queue.shift()!)
  })
  await Promise.all(workers)
}

async function withRetry<T>(fn: () => Promise<T>, { retries, backoffMs }: { retries: number; backoffMs: number[] }): Promise<T> {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try { return await fn() }
    catch (e) {
      lastErr = e
      if (i < retries && isTransient(e)) await sleep(backoffMs[i] ?? 1000)
      else throw e
    }
  }
  throw lastErr
}

function isTransient(e: any) {
  const msg = e?.message?.toLowerCase() ?? ''
  return msg.includes('timeout') || msg.includes('429') || msg.includes('rate') || msg.includes('5')
}
```

Data-URL fallback when no Blob token: skip animation step entirely (return error per scene); video is too large for data URL fallback.

### `components/AnimateButton.tsx` (NEW)
Props: `{ storyId, scenes, onSceneVideo(sceneId, url), onAllDone() }`.
- Button: "Animate All" (disabled if no scenes or all already animated).
- Shows pending count: "Animate 7 scenes (~$0.18)".
- On click: POST `/api/animate`, read SSE, dispatch per-scene callbacks.
- Inline progress: small N/total text next to button.

### `components/SceneCard.tsx` (CHANGE)
Render `<video>` instead of `<img>` when `isPlaying && scene.videoUrl`:
```tsx
{scene.imageUrl ? (
  isPlaying && scene.videoUrl ? (
    <video
      src={scene.videoUrl}
      autoPlay
      muted
      playsInline
      className="scene-image"
    />
  ) : (
    <img src={scene.imageUrl} alt={scene.sentence} className="scene-image" />
  )
) : (
  <div className="scene-skeleton">...</div>
)}
```

Small `🎬` indicator badge in corner when scene has `videoUrl` (so user sees which scenes are animated).

### `app/page.tsx` (CHANGE)
1. Render `<AnimateButton>` in panel-controls near Play All.
2. Handle SSE callbacks: update `storyData.scenes[i].videoUrl` as each completes.
3. Persist updates to localStorage via `updateStoryScene(id, sceneId, { videoUrl })`.
4. Hydration: include `videoUrl` in restored state.

### `lib/storage.ts` (CHANGE)
`updateStoryScene` from PR 1 already covers this; ensure `videoUrl` is among the allowed patch fields.

### `app/globals.css`
- `.animate-btn` styles.
- `.scene-card .video-badge` for the 🎬 indicator.
- `.scene-card .anim-progress` overlay during per-scene animation.

---

## Edge cases
- Scene has no `imageUrl`: skip from animate batch (can't I2V without input).
- Image still on a `data:` URL (Blob fallback): Fal can't fetch data URLs; surface error per scene, suggest user enable Blob token.
- User clicks "Animate All" twice quickly: route is idempotent (skip-existing), second batch is empty no-op.
- Fal returns moderation block: surface error per scene.
- `motionPrompt` missing (legacy story from before this PR): fall back to `scene.action`. If both missing, use generic "subtle natural motion."

## Out of scope
- Per-scene reroll button (Q13-c alt).
- Variable clip duration (Q9-b alt) — fixed 5s.
- Reference-image consistency between clips (Q8-c alt).
- Video provider UI picker — env-only.

## Test plan
- [ ] Set `VIDEO_MODEL=ltx-video-fal`, generate story, click "Animate All"
- [ ] All scenes get videoUrl, persisted across refresh
- [ ] Click a scene → `<video>` mounts and plays muted, voiceover plays in parallel
- [ ] Re-click "Animate All" → no requests fire (idempotent)
- [ ] Force one scene to fail (block in network) → other scenes succeed, failed scene shows error, re-click retries just that one
- [ ] `VIDEO_MODEL=kling-1.6-std-fal` → uses Kling adapter
- [ ] `VIDEO_MODEL=invalid` → falls back to LTX with warning log
- [ ] No `FAL_KEY` → clear 500 error from /api/animate
- [ ] No `BLOB_READ_WRITE_TOKEN` → animate endpoint returns per-scene errors with hint
- [ ] Concurrency: monitor network panel, ≤4 simultaneous Fal requests

## Estimated LOC
~450 across:
- 4 new provider files (~150)
- 1 new endpoint (~150)
- 1 new component (~50)
- 1 SceneCard change (~30)
- 1 page.tsx change (~40)
- types + schema + CSS (~30)

## Risk
- **LTX motion quality on stickman line art**: low-confidence. May produce wonky deformations. Mitigation: env-swap to Kling Std (4× cost, much better quality on cartoons).
- **Fal concurrency limits** (varies by account): cap of 4 should stay under default. If hit, drop to 2.
- **5s × freeze-frame may look static for long voiceovers**: acceptable for MVP; addressable later with looped motion or variable-duration Kling.
