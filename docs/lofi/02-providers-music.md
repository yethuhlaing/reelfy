# 02 — Music Provider Registry

Mirrors the existing video provider pattern at [shared/lib/providers/video.ts](../../shared/lib/providers/video.ts).

## Files

```
shared/lib/providers/
  music.ts                      # registry, dispatch
  music-fal-minimax.ts
  music-fal-stable-audio.ts
  music-fal-cassette.ts
```

## Common interface

Each model adapter exports the same shape:

```ts
export interface MusicGenInput {
  prompt: string
  durationSec: number
  webhookUrl: string
}

export interface MusicGenSubmitResult {
  jobId: string
  falModel: string         // fal model id used (for cost log)
  estimatedCostUsd: number
}

export interface MusicGenProvider {
  key: string              // 'minimax' | 'stable-audio' | 'cassette'
  label: string            // UI label
  maxDurationSec: number
  defaultDurationSec: number
  creditsPerLoop: number
  costPerLoopUsd: number
  submit(input: MusicGenInput): Promise<MusicGenSubmitResult>
}
```

## Registry

```ts
// shared/lib/providers/music.ts
import { minimaxProvider } from './music-fal-minimax'
import { stableAudioProvider } from './music-fal-stable-audio'
import { cassetteProvider } from './music-fal-cassette'

const providers: Record<string, MusicGenProvider> = {
  minimax: minimaxProvider,
  'stable-audio': stableAudioProvider,
  cassette: cassetteProvider,
}

export function getMusicProvider(key?: string): MusicGenProvider {
  const id = key ?? process.env.MUSIC_MODEL ?? 'minimax'
  if (!providers[id]) {
    console.warn(`Unknown MUSIC_MODEL "${id}", falling back to minimax`)
    return providers.minimax
  }
  return providers[id]
}

export function listMusicProviders() {
  return Object.values(providers)
}
```

## Model adapters

### minimax (`music-fal-minimax.ts`)
- fal model: `fal-ai/minimax/music-1.5` (verify exact id at impl time)
- max: 240s
- default: 90s
- credits: 5/loop, cost: ~$0.10/loop
- best vibe match for lofi melodic content

### stable-audio (`music-fal-stable-audio.ts`)
- fal model: `fal-ai/stable-audio`
- max: 47s
- default: 45s
- credits: 2/loop, cost: ~$0.05/loop
- good for short texture/transition stabs

### cassette (`music-fal-cassette.ts`)
- fal model: `fal-ai/cassetteai/music-generator`
- max: 180s
- default: 120s
- credits: 1/loop, cost: ~$0.01/loop
- cheapest, decent quality, no native loop seam handling

## Ambient bed (not generated)

Royalty-free static MP3 files committed to `public/lofi-beds/`:
- `rain.mp3`
- `vinyl.mp3`
- `fireplace.mp3`
- `cafe.mp3`

Source: freesound.org / pixabay (verify CC0 / CC-BY before commit; document licence). ~5min files, looped in ffmpeg.

Bed mixed under main music at -18 to -22 LUFS via arrangement filter graph.

## Submit pattern

Each `submit()` follows the existing fal pattern:

```ts
const submitted = await fal.queue.submit(MODEL_ID, {
  input: { prompt, duration: durationSec, ... },
  webhookUrl,
})
return { jobId: submitted.request_id, falModel: MODEL_ID, estimatedCostUsd: COST }
```

Webhook target: `/api/webhooks/fal/music/[jobId]` ([06-orchestration.md](06-orchestration.md)).

## User-side selection

Form exposes `<Select>` of `listMusicProviders().map(p => ({ value: p.key, label: p.label }))`. Selected key stored on `lofiVideos.musicModel`. All loops in one video use the same model (MVP simplification — mixed pools post-MVP).
