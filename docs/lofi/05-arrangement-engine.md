# 05 — Arrangement Engine

Takes ready music loops + visual assets + ambient bed → produces a JSON arrangement plan → compiles plan into an ffmpeg `filter_complex` graph → submits one `fal-ai/ffmpeg-api` job to render the final MP4.

Lives at `features/lofi/server/arrangement.ts`.

## Why JSON plan first

Separating plan from filter graph lets us:
- Persist the plan (`lofiVideos.arrangementJson`) for reproducibility / regenerate
- Unit-test plan generation without ffmpeg
- Debug timing issues by inspecting the JSON

## Plan schema

```ts
type ArrangementPlan = {
  totalDurationSec: number
  music: {
    bed: { url: string; gainDb: number } | null
    blocks: Array<{
      loopUrl: string
      startSec: number
      durationSec: number       // total time this loop occupies (repeats × loopLen)
      repeats: number
      crossfadeInSec: number    // overlap into previous block
    }>
  }
  visual: {
    mode: VisualMode
    clips: Array<{
      assetUrl: string
      startSec: number
      durationSec: number
      crossfadeInSec: number    // 1-2s xfade with previous
    }>
  }
}
```

## Music block generation

Inputs:
- `targetDurationSec` (e.g. 3600 for 1hr)
- `loops: Array<{ url, lengthSec }>` (the ready assets, sorted by orderIndex)
- crossfade default: 12 seconds

Algorithm:
```
remaining = targetDurationSec + (crossfade * loops.length) // padding for overlaps
shuffled = shuffleStable(loops, seed=videoId)
blocks = []
cursor = 0
i = 0
while cursor < targetDurationSec:
  loop = shuffled[i % shuffled.length]
  // play 2-3 times per appearance to feel settled
  repeats = randomInt(2, 3, seed=videoId+i)
  blockDur = loop.lengthSec * repeats
  blocks.push({
    loopUrl: loop.url,
    startSec: cursor - (i > 0 ? crossfade : 0),
    durationSec: blockDur,
    repeats,
    crossfadeInSec: i > 0 ? crossfade : 0,
  })
  cursor += blockDur - crossfade
  i++
trim last block so cursor === targetDurationSec
```

Seeded RNG so re-running on same video produces same plan.

## Visual clip generation

Inputs:
- `mode: VisualMode`
- `assets: Array<{ url, durationSec }>` (user-provided durations from form)
- crossfade default: 2 seconds

For `single-*`: one clip, `durationSec = targetDurationSec`, no crossfade.

For `multi-*`:
```
cursor = 0
clips = []
for asset in assets:
  startSec = cursor - (clips.length > 0 ? 2 : 0)
  clips.push({ assetUrl: asset.url, startSec, durationSec: asset.durationSec, crossfadeInSec: clips.length > 0 ? 2 : 0 })
  cursor += asset.durationSec - 2
truncate or pad last clip so cursor === targetDurationSec
```

## Compiling plan → ffmpeg filter_complex

Two streams produced: `[aout]` (mixed audio), `[vout]` (visual track). Then muxed to MP4.

### Audio graph (sketch)
```
[0:a]loop=-1,atrim=0:LOOP0_DUR[a0]
[1:a]loop=-1,atrim=0:LOOP1_DUR[a1]
...
[a0][a1]acrossfade=d=12[ac01]
[ac01][a2]acrossfade=d=12[ac012]
... (chain)
[bed:a]aloop=-1,atrim=0:TOTAL,volume=-18dB[bed_a]
[ac_all][bed_a]amix=inputs=2:duration=first[aout]
```

### Visual graph
For `single-image`:
```
[img:v]loop=-1:size=1:start=0,scale=1920:1080,setsar=1[vout]
```
For `multi-video`:
```
[v0]trim=0:DUR0,scale=1920:1080,setsar=1[v0t]
[v1]trim=0:DUR1,scale=1920:1080,setsar=1[v1t]
[v0t][v1t]xfade=transition=fade:duration=2:offset=OFFSET0[vx01]
[vx01][v2t]xfade=...[vx012]
```

### Output
```
-map [vout] -map [aout] -c:v libx264 -tune stillimage (or film) -c:a aac -b:a 192k -shortest output.mp4
```

## fal ffmpeg-api submit

Already used at [app/api/compose/route.ts](../../app/api/compose/route.ts) for stickman compose. Reuse pattern. Submit shape:

```ts
const submitted = await fal.queue.submit('fal-ai/ffmpeg-api/compose', {
  input: {
    inputs: [...loopUrls, ...visualUrls, bedUrl].map(url => ({ url })),
    filter_complex: buildFilterGraph(plan),
    output: { format: 'mp4', codec: 'h264' },
  },
  webhookUrl: `${baseUrl}/api/webhooks/fal/lofi-render/${jobId}`,
})
```

NOTE: fal-ai/ffmpeg-api compose endpoint input shape needs verification against current docs at impl time. Sketch above is structurally indicative.

## Render cost

`fal-ai/ffmpeg-api/compose` charges by output minute, ~$0.005/min. 2hr = ~$0.60. 5 credits flat charged to user.

## Failure mode

If fal compose job fails (timeout, filter graph error):
- Capture error from webhook
- Mark `lofiVideos.status='failed'`, store `errorMessage`
- Refund the render-stage credits (5cr), leave per-asset charges as-is (assets are still in user's "library" conceptually for retry)
- Surface retry button in UI — retries arrangement + render only, reuses existing assets
