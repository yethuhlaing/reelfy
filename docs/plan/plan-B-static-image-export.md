# Plan B — Static Image Export (ffmpeg.wasm)

Allow export when no scenes are animated. Voiceover plays over static scene images. Runs entirely in browser via ffmpeg.wasm — no fal cost, no job polling.

## Rules
- **Animated mode**: any scene has `videoUrl` → use existing fal compose pipeline (unchanged)
- **Static mode**: zero scenes have `videoUrl` → use ffmpeg.wasm in browser
- **No mixing** — one mode per story, auto-detected

## Steps

### 1. Install packages
```
@ffmpeg/ffmpeg
@ffmpeg/util
```

### 2. lib/states/workspace-state.ts
Change export button visibility condition:
```ts
// before
visible: anyVideoReady,

// after
const anyImageReady = scenes.some((s) => !!s.imageUrl)
visible: anyVideoReady || anyImageReady,
```

### 3. context/export-state.tsx — static branch

Add mode detection in `startExport`:
```ts
const isStatic = scenes.every((s) => !s.videoUrl)
```

**Static path flow:**
1. Filter scenes: those with `imageUrl` in range
2. Per scene: generate / fetch voiceover URL + probe duration (same as current)
3. Load ffmpeg.wasm lazily (`await import('@ffmpeg/ffmpeg')`)
4. Per scene: write image file into ffmpeg FS, run freeze-frame command:
   ```
   ffmpeg -loop 1 -i scene.jpg -t <duration> -vf scale=1920:1080 -r 30 -c:v libx264 clip_N.mp4
   ```
5. Concatenate all clips + mix audio tracks:
   ```
   ffmpeg -i clip_0.mp4 -i audio_0.mp3 ... -filter_complex concat=... output.mp4
   ```
6. Read output bytes → `URL.createObjectURL(blob)` → set as `downloadUrl`

Progress updates emitted per scene (e.g. scene 1/4 = 25%).

**ExportState changes:**
- Static path never sets `jobId` or `startedAt`
- No `useJobPoller` involvement
- `status` transitions: `preparing` → `rendering` → `done` | `failed` (same states, different driver)

### 4. components/workspace/ExportModal.tsx

Auto-detect static mode from scenes prop:
```ts
const isStaticMode = scenes.every((s) => !s.videoUrl)
```

Show banner when static mode:
```tsx
{isStaticMode && (
  <div className="...">
    No animations found — exporting as static slideshow
  </div>
)}
```

Progress bar stays the same (driven by `state.progress`).
Download link stays the same (driven by `state.downloadUrl`).
No user toggle needed — mode is auto-detected.

## What stays untouched
- `/api/compose` route — animated path unchanged
- `fal-ai/ffmpeg-api/compose` — only used for animated export
- `useJobPoller` — only used for animated export
- Resolution option — still passed, used in ffmpeg scale filter for static
- Range option — still applied to scene filtering
- Voiceover generation on-the-fly — same logic for both modes
- Intro / thumbnail in export — existing behaviour unchanged

## Notes
- ffmpeg.wasm is ~30MB, loaded lazily only when static export starts
- Requires `SharedArrayBuffer` → needs COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`)
- Add headers to `next.config` if not already present
