# 03 — Visual Modes & Providers

User picks one of 4 visual modes. Image and video providers reuse existing stickman registries — no new provider files needed.

## Existing registries reused

- Image: [shared/lib/providers/image.ts](../../shared/lib/providers/image.ts) — flux-schnell, flux-pro, gemini
- Video: [shared/lib/providers/video.ts](../../shared/lib/providers/video.ts) — ltx-video, longcat, kling

## 4 visual modes

| Mode | Asset count | Each duration source | Render strategy |
|------|-------------|----------------------|-----------------|
| `single-image` | 1 image | n/a (covers full video) | `ffmpeg -loop 1 -i img.png -i audio.mp3 -tune stillimage -shortest` |
| `multi-image` | 2-N images | user-defined per asset | xfade chain across images with `zoompan` slow zoom |
| `single-video` | 1 short video (5-15s) | n/a (loops) | `ffmpeg -stream_loop -1 -i clip.mp4 -i audio.mp3 -shortest` |
| `multi-video` | 2-N short videos | user-defined per asset | concat demuxer cycling N clips with crossfade |

## Form schema (visual section)

```ts
type VisualMode = 'single-image' | 'multi-image' | 'single-video' | 'multi-video'

type VisualAsset = {
  prompt: string
  durationSec: number    // only for multi-* modes; ignored for single-*
}

type VisualConfig = {
  mode: VisualMode
  model: string          // imageModel key or videoModel key based on mode
  assets: VisualAsset[]
}
```

Validation rules:
- `single-image` / `single-video` → exactly 1 asset, `durationSec` ignored
- `multi-image` / `multi-video` → 2-12 assets, `sum(durationSec) >= lofiVideos.targetDurationSec`
  - If sum > target, last asset truncates
  - If sum < target, validation error: "visual assets total %ds, need at least %ds"

## Asset gen pricing (per-asset)

| Model | Kind | Credits | Cost USD |
|-------|------|---------|----------|
| flux-schnell | image | 1 | $0.003 |
| flux-pro | image | 5 | $0.05 |
| gemini-2.5-flash-image | image | 2 | $0.01 |
| ltx-video | video clip (5s) | 5 | $0.10 |
| longcat | video clip | 10 | $0.20 |
| kling 2.6 pro | video clip | 25 | $0.50 |

## Asset row creation

For each visual asset in form, create one `lofiAssets` row with `kind='visual'`, `model=<modelKey>`, `durationSec=<displayTime>`. Submit happens at stage 2 fan-out.

## Loop seamlessness for `single-video` / `multi-video`

5-15s AI-gen video clips rarely loop seamlessly. Mitigations:
- Generate at 10-15s, ffmpeg loops the middle 8s with reverse-pingpong: `[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]` then `-stream_loop -1`
- For multi-video, crossfade between clips hides loop seam under switch

Recommended default model: `ltx-video` for cost. Upsell to `kling` for premium.

## Resolution

All visuals targeted 1920×1080 (YouTube standard). Image and video providers already default close to this. Add `-vf scale=1920:1080:force_original_aspect_ratio=cover,crop=1920:1080` in arrangement filter graph as safety.

## Visual switch behavior (multi-*)

Per Q6 decision: user-defined `durationSec` per clip. Arrangement engine ([05-arrangement-engine.md](05-arrangement-engine.md)) builds visual timeline using these values, applies 1-2s xfade between clips. Visual timeline is independent of music timeline.
