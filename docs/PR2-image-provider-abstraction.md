# PR 2 — Image Provider Abstraction + Fal.ai Flux Swap

## Goal
Replace Nano Banana (Gemini image model) with Fal.ai Flux Schnell. Introduce a provider adapter layer so swapping image models is a one-file change going forward.

## Depends on
PR 1 (Blob storage patterns, persistence). Does NOT depend on PR 3/4/5.

## User-visible outcomes
- Same UX as today.
- ~13× cheaper per generation (~$0.03 vs ~$0.40 for 10 scenes).
- Slightly different visual style (Flux line-art aesthetic vs Gemini).
- Env-driven model swap without code changes.

## Cost shift
- Old: Nano Banana ~$0.04/image × 10 = $0.40/story
- New: Flux Schnell ~$0.003/image × 10 = $0.03/story

---

## Dependencies
```json
{ "@fal-ai/client": "^..." }
```

## Env
```
FAL_KEY=...
IMAGE_MODEL=flux-schnell-fal      # default
```
Keep `GEMINI_API_KEY` for `planStory()` (still used for JSON planning).

---

## File changes

### `lib/providers/image.ts` (NEW)
Adapter interface + registry.
```ts
export interface ImageProvider {
  id: string
  costEstimateUsd: number
  generate(prompt: string, opts: ImageOpts): Promise<{ mimeType: string; data: Buffer }>
}

export interface ImageOpts {
  aspectRatio: '16:9'         // future: other ratios
  resolution?: '1024x576' | '1280x720' | '1920x1080'
}

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  'flux-schnell-fal':   fluxSchnellFal,
  'flux-dev-fal':       fluxDevFal,
  'sdxl-lightning-fal': sdxlLightningFal,
  'nano-banana':        nanoBananaGemini,  // legacy fallback, kept for safety
}

export function getImageProvider(id?: string): ImageProvider {
  const key = id ?? process.env.IMAGE_MODEL ?? 'flux-schnell-fal'
  return IMAGE_PROVIDERS[key] ?? IMAGE_PROVIDERS['flux-schnell-fal']
}
```

### `lib/providers/fal.ts` (NEW)
Shared Fal client + helpers.
```ts
import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY })

export { fal }
```

### `lib/providers/image-fal-flux-schnell.ts` (NEW)
```ts
import { fal } from './fal'
import type { ImageProvider } from './image'

export const fluxSchnellFal: ImageProvider = {
  id: 'flux-schnell-fal',
  costEstimateUsd: 0.003,
  async generate(prompt, _opts) {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'landscape_16_9',     // 1024x576
        num_inference_steps: 4,
        enable_safety_checker: false,
        num_images: 1,
      },
      logs: false,
    })
    const url = (result.data as any).images[0].url
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    const mimeType = res.headers.get('content-type') ?? 'image/png'
    return { mimeType, data: buf }
  },
}
```

### `lib/providers/image-fal-flux-dev.ts` (NEW)
Same shape as schnell, using `fal-ai/flux/dev` endpoint and `num_inference_steps: 28`.

### `lib/providers/image-fal-sdxl-lightning.ts` (NEW)
Same shape, using `fal-ai/fast-lightning-sdxl`. Note: weaker in-image text rendering — surface in README.

### `lib/providers/image-nano-banana.ts` (NEW)
Wraps existing `generateSceneImage` from `lib/gemini.ts`. Marked legacy.
```ts
import { generateSceneImage } from '@/lib/gemini'
import type { ImageProvider } from './image'

export const nanoBananaGemini: ImageProvider = {
  id: 'nano-banana',
  costEstimateUsd: 0.04,
  generate: (prompt) => generateSceneImage(prompt),
}
```

### `lib/gemini.ts` (CHANGE)
- Keep `planStory()` exported (still used).
- Keep `generateSceneImage()` exported (used by `image-nano-banana.ts` adapter).
- No prompt rewrites in this PR — Flux understands the existing imagePrompt structure well. Verify on first preview deploy; may need a Flux-specific prompt tweak (typically: remove "panel" mentions that confuse SD models, add "comic illustration" anchor).

### `app/api/generate/route.ts` (CHANGE)
Replace direct `generateSceneImage(scene.imagePrompt)` calls with:
```ts
const imageProvider = getImageProvider()
// ...
const { mimeType, data } = await imageProvider.generate(scene.imagePrompt, { aspectRatio: '16:9' })
```
Surface `imageProvider.id` in an SSE `info` event so user can verify which model ran.

### Prompt compatibility check
Flux Schnell handles:
- ✅ In-image text (quoted speech bubbles, captions, signs) — better than SDXL
- ✅ "16:9" aspect anchoring
- ✅ Style preamble lock
- ⚠️ Word "panel" sometimes interpreted literally (drawn panel borders) — should already be guarded by the recently added "NO frame, NO border" clause in `IMAGE_STYLE_PREAMBLE`
- ⚠️ Long prompts (>200 tokens) sometimes get truncated — current 90-160 word imagePrompts are safely under

If first deploy shows panel borders despite the "NO border" instruction, add Flux-specific negative-prompt-style anchor at end of preamble: "Edges of the image must show only the off-white paper background; no rectangle outline anywhere."

---

## Edge cases
- `FAL_KEY` missing: provider throws clear error, route returns 500 with hint.
- Fal endpoint down: surface error per scene via existing `scene-image-error` SSE event; other scenes continue.
- `IMAGE_MODEL` env set to unknown id: fall back to default, log warning.
- Fal returns moderation block on a prompt: catch, surface as scene error.

## Out of scope
- Per-request model picker in UI (env-only for MVP).
- Replicate adapters (Fal.ai only).
- Reference-image conditioning (IP-Adapter) for cross-scene character consistency — see Q8 escape valve, deferred.
- Negative prompts in API surface — Flux Schnell doesn't accept them; SDXL Lightning adapter could add later.

## Test plan
- [ ] Set `IMAGE_MODEL=flux-schnell-fal`, generate, verify Fal API hit in network panel
- [ ] Generated scenes have correct 16:9 aspect, comic style, readable in-image text
- [ ] Unset `IMAGE_MODEL` → falls back to default (flux-schnell-fal)
- [ ] Set `IMAGE_MODEL=nano-banana` → original Gemini path still works (regression test)
- [ ] Set `IMAGE_MODEL=invalid-id` → falls back to default with warning in server logs
- [ ] Cost sanity check: Fal dashboard shows ~$0.003/image after a full story
- [ ] Image quality acceptable on stickman art (character drift may be visible; document)

## Estimated LOC
~250 across 5 new files + 1 changed file.

## Risk
- **Visual quality drop** vs Nano Banana. Mitigation: keep `nano-banana` adapter as env-flip fallback. Run side-by-side comparison before merging.
- **Character drift across scenes** (Q8 deferred). Acceptable for MVP — log known limitation. If unacceptable post-deploy, add IP-Adapter conditioning as a follow-up patch (one file change).
