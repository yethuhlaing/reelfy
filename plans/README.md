# Implementation Plans

Five sequenced PRs delivering: persistence, Fal.ai image provider swap, thumbnail generator, animation step (image-to-video), and video compose pipeline.

| PR | File | Adds | Depends on |
|----|------|------|------------|
| 1  | [PR1-persistence-and-voiceover-blob.md](./PR1-persistence-and-voiceover-blob.md) | localStorage recent-5 list, voiceovers stored in Vercel Blob, refresh-resume | — |
| 2  | [PR2-image-provider-abstraction.md](./PR2-image-provider-abstraction.md) | Provider adapter layer, Fal.ai Flux Schnell as default (~13× cheaper than Nano Banana) | — |
| 3  | [PR3-thumbnail-generator.md](./PR3-thumbnail-generator.md) | Hero "cover" image per story via Fal provider | PR 1 + PR 2 |
| 4  | [PR4-animation-step.md](./PR4-animation-step.md) | Video provider adapter, "Animate All" button, Fal LTX-Video I2V, 5s clips in Blob | PR 1 + PR 2 |
| 5  | [PR5-video-compose-pipeline.md](./PR5-video-compose-pipeline.md) | "Render Video" → MP4 with karaoke captions, mixed-mode (video clips + static fallback), Whisper alignment, libass | PR 1 + PR 3 (PR 4 optional) |

## Pipeline cost (10-scene story)

| Stage | Cost | Notes |
|---|---|---|
| Plan (Gemini Flash text) | ~$0.001 | JSON output, ~2k tokens |
| 10 scene images (Flux Schnell) | ~$0.030 | $0.003 × 10 |
| Thumbnail image (Flux Schnell) | ~$0.003 | one frame |
| 10 voiceovers (ElevenLabs) | ~$0.03 | per character pricing |
| 10 animations (LTX-Video) | ~$0.25 | $0.025 × 10 |
| 10 Whisper alignments (Groq) | ~$0.001 | $0.0003/min × 60s |
| Final ffmpeg render (Vercel compute) | ~$0.01 | 60-90s function time |
| Blob storage + bandwidth | ~$0.01 | per story month-1 |
| **Total** | **~$0.34/story** | full animated comic w/ captions |

## Locked design decisions

### Persistence
- Scope: local-only (localStorage)
- Recent stories: list of 5, left-panel below StoryInput
- Voiceover storage: lazy upload to Vercel Blob via `/api/voiceover`

### Image generation
- Provider: Fal.ai (Replicate not wired for MVP)
- Default model: `flux-schnell-fal` (1024×576, ~$0.003/img)
- Alternates registered: `flux-dev-fal`, `sdxl-lightning-fal`, `nano-banana` (legacy)
- Selection: env var `IMAGE_MODEL`
- Character consistency: text-only (protagonist line in every prompt); IP-Adapter as future escape valve

### Animation (image-to-video)
- Provider: Fal.ai
- Default model: `ltx-video-fal` (5s clips, ~$0.025/clip)
- Alternates: `kling-1.6-std-fal`, `svd-fal`
- Selection: env var `VIDEO_MODEL`
- Duration: fixed 5s (compose freezes last frame to match longer voiceovers)
- Concurrency: 4 parallel
- Trigger: explicit "Animate All" button after stills review
- Cache: skip already-animated scenes (idempotent)
- Failure: transient retry × 2, permanent fail per-scene tolerant
- Motion prompt: new `motionPrompt` field on every scene (planStory output)

### Thumbnail
- Trigger: lazy on-demand button
- Aesthetic: hybrid comic + baked-in title typography
- Prompt: embedded in `planStory` JSON output (`thumbnailPrompt` field — already wired)
- UI: empty slot above scene grid with Generate CTA
- Storage: Vercel Blob at `thumbnails/<storyId>.png`

### Video composition
- Engine: server-side ffmpeg (`@ffmpeg-installer`)
- Mode: mixed (animated clips where available, static + Ken Burns otherwise)
- Scene pacing: voiceover duration + 0.4s tail
- Transitions: hard cuts
- Intro: 2.5s thumbnail with slight zoom, silent
- Output: 1920×1080, 30fps, H.264 + AAC, MP4
- Background music: none (MVP)
- Captions: hard-burned karaoke via libass, configurable constant
- Whisper alignment: Groq `whisper-large-v3`, lazy in compose, parallel
- Failure: retry transient × 2, hard-fail permanent
- ffmpeg concurrency: serial clip encode

## Environment variables

```
# Required
GEMINI_API_KEY=                       # planStory JSON output
ELEVENLABS_API_KEY=                   # voiceover TTS
FAL_KEY=                              # image + video gen
GROQ_API_KEY=                         # Whisper alignment (PR 5)
BLOB_READ_WRITE_TOKEN=                # Vercel Blob storage

# Optional (defaults shown)
IMAGE_MODEL=flux-schnell-fal
VIDEO_MODEL=ltx-video-fal
```
