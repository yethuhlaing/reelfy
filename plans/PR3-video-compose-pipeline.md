# PR 3 — Video Compose Pipeline

## Goal
"Render Video" button assembles all scenes + voiceovers + thumbnail intro into a single downloadable MP4 with hard-burned karaoke captions.

## Depends on
PR 1 (durable voiceover Blob URLs) + PR 2 (thumbnail URL).

## User-visible outcomes
- New "Render Video" button in panel header (next to Play All).
- Click → SSE stream → multi-stage StageList (Voiceovers → Alignment → Encoding → Concat → Upload).
- On finish: inline `<video controls>` player + download button.
- Final video URL persisted in StoryData (refresh shows the same video).

## Output spec
- 1920×1080, 30fps, H.264 yuv420p, AAC 128k, MP4
- Hard cuts, no transitions
- Per scene: Ken Burns slow zoom-in (1.0 → 1.05) over `audioDuration + 0.4s`
- Intro: 2.5s thumbnail with slight zoom, silent
- Captions: karaoke ASS, white + black outline, current word in yellow (`#FFD700`), bottom-centered, ~70% width

---

## Dependencies (npm)
```json
{
  "@ffmpeg-installer/ffmpeg": "^...",
  "@ffmpeg-installer/ffprobe": "^...",   // or "ffprobe-installer"
  "groq-sdk": "^..."
}
```

## Env
```
GROQ_API_KEY=
```

## Vercel function config
`app/api/compose/route.ts`:
```ts
export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'
```
Include ffmpeg binaries via `next.config.mjs` `experimental.serverComponentsExternalPackages` or `outputFileTracingIncludes`.

---

## File changes

### `lib/caption-style.ts` (NEW)
Single source of truth for caption visual. Configurable via constants.
```ts
export const CAPTION_STYLE = {
  fontName: 'Inter',                  // bundled or system fallback
  fontSize: 64,
  fontWeight: 'Bold',
  primaryColor: '&H00FFFFFF',         // white (BGR + alpha, libass format)
  highlightColor: '&H0000D7FF',       // yellow #FFD700
  outlineColor: '&H00000000',         // black
  outlineWidth: 4,
  marginVertical: 80,                 // px from bottom
  marginHorizontal: 80,
  maxWidthPct: 70,
  alignment: 2,                       // bottom-center (libass)
} as const
```

### `lib/whisper.ts` (NEW)
Groq forced-alignment wrapper.
```ts
import Groq from 'groq-sdk'

export interface WordTiming { word: string; start: number; end: number }

export async function alignAudio(mp3Url: string, expectedText: string): Promise<WordTiming[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const audioBlob = await fetch(mp3Url).then(r => r.blob())
  const file = new File([audioBlob], 'voice.mp3', { type: 'audio/mpeg' })

  const result = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    prompt: expectedText,             // bias alignment toward known text
  })

  return (result as any).words.map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
  }))
}
```
Retry wrapper: 2 attempts w/ exp backoff for network/rate-limit errors.

### `lib/ass.ts` (NEW)
Build ASS subtitle file content from per-scene word timings.
Signatures:
```ts
export interface SceneTiming {
  startSec: number               // absolute seconds in final video
  words: WordTiming[]
}

export function buildAssFile(scenes: SceneTiming[]): string
```

Output shape:
```
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, ...
Style: Default,Inter,64,&H00FFFFFF,&H0000D7FF,&H00000000,...,4,0,2,80,80,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:06.40,Default,,0,0,0,,{\k50}Hello {\k40}world {\k60}this {\k55}is {\k70}me
```

Karaoke math: each `\k<centiseconds>` = duration current word holds the highlight (start→end of word).

Line wrapping: simple greedy split at ~7 words/line, max 2 lines per scene. Multi-line if voiceover is longer.

### `lib/ffmpeg.ts` (NEW)
Wrapper utilities.
```ts
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffmpeg-installer/ffprobe'
import { spawn } from 'node:child_process'

export async function probeDuration(filePath: string): Promise<number>
export async function downloadToTemp(url: string, ext: string): Promise<string>
export async function encodeClip(opts: {
  imagePath: string
  audioPath: string | null         // null for intro card
  durationSec: number
  zoomFrom: number                 // e.g. 1.0
  zoomTo: number                   // e.g. 1.05
  outputPath: string
}): Promise<void>
export async function concatClips(clipPaths: string[], outputPath: string): Promise<void>
export async function burnSubtitles(inputPath: string, assPath: string, outputPath: string, fontsDir?: string): Promise<void>
```

Working dir: `/tmp/compose-<storyId>/` — created fresh per request, cleaned up in `finally`.

ffmpeg command shape for `encodeClip` (with audio):
```
ffmpeg -y -loop 1 -i image.png -i voice.mp3 \
  -t <durationSec> \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0008,1.05)':d=<frames>:s=1920x1080:fps=30" \
  -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest clip_N.mp4
```

For intro (no audio):
```
ffmpeg -y -loop 1 -i thumb.png -f lavfi -t 2.5 -i anullsrc=cl=stereo:r=48000 \
  -vf "scale=...,zoompan=..." -t 2.5 \
  -c:v libx264 ... -c:a aac ... clip_intro.mp4
```

Concat via demuxer:
```
ffmpeg -y -f concat -safe 0 -i list.txt -c copy concat.mp4
```
(Requires all clips encoded with identical codec/timebase params.)

Burn subtitles as separate final pass:
```
ffmpeg -y -i concat.mp4 -vf "subtitles=captions.ass:fontsdir=/tmp/fonts" -c:v libx264 -crf 20 -c:a copy final.mp4
```

### `app/api/compose/route.ts` (NEW)
SSE endpoint. Heavy. Sketch:
```ts
export async function POST(request: Request) {
  const { storyId } = await request.json()
  // Validate story exists, fetch latest stored StoryData via client-passed payload OR from request body
  // (Note: server has no localStorage — client must POST the full StoryData.)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: ComposeEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))
      try {
        const { storyData } = await request.json()

        // STAGE 1: voiceovers
        send({ type: 'stage', id: 'voiceovers', status: 'active' })
        for each scene without voiceoverUrl:
          generate via ElevenLabs + upload to Blob + emit progress
        send({ type: 'stage', id: 'voiceovers', status: 'done' })

        // STAGE 2: alignment (parallel)
        send({ type: 'stage', id: 'alignment', status: 'active' })
        const timings = await Promise.all(scenes.map(s => alignAudio(s.voiceoverUrl, s.voiceover)))
        send({ type: 'stage', id: 'alignment', status: 'done' })

        // STAGE 3: thumbnail (if missing)
        if (!storyData.thumbnailUrl) generate via /api/thumbnail logic inline

        // STAGE 4: encoding (serial)
        send({ type: 'stage', id: 'encoding', status: 'active' })
        download all assets to /tmp
        encodeClip for intro (2.5s, silent, thumbnail)
        for each scene: encodeClip with audio + zoompan, emit per-clip progress
        send({ type: 'stage', id: 'encoding', status: 'done' })

        // STAGE 5: concat
        write list.txt, concatClips → concat.mp4

        // STAGE 6: burn subtitles
        buildAssFile(...) → captions.ass
        burnSubtitles(concat.mp4, captions.ass, final.mp4)

        // STAGE 7: upload
        put(`videos/${storyId}.mp4`, fs.createReadStream(final.mp4), { access: 'public', allowOverwrite: true })
        send({ type: 'final', url })
        send({ type: 'complete' })
      } catch (e) {
        send({ type: 'error', error: e.message })
      } finally {
        cleanup /tmp/compose-<storyId>
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}
```

Compose-specific event types:
```ts
type ComposeEvent =
  | { type: 'stage'; id: 'voiceovers' | 'alignment' | 'thumbnail' | 'encoding' | 'concat' | 'subtitles' | 'upload'; status: StageStatus; detail?: string }
  | { type: 'clip-progress'; done: number; total: number }
  | { type: 'final'; url: string }
  | { type: 'error'; error: string }
  | { type: 'complete' }
```

### `components/RenderVideo.tsx` (NEW)
Props: `{ storyData, storyId, onComplete(url) }`.
- Button "Render Video" (disabled if no scenes).
- On click: POST `/api/compose` with full storyData, read SSE, drive a StageList instance.
- On `final`: show download button + inline `<video controls src={url} />`.

### `app/page.tsx` (CHANGE)
- Place `<RenderVideo>` next to PlayAll button.
- On complete: setStoryData with `finalVideoUrl`, persist via `updateStory(id, ...)`.
- Render `<video controls>` block if `storyData.finalVideoUrl` exists (so refresh restores player too).

### `lib/types.ts`
```ts
export interface StoryData {
  // ...existing...
  finalVideoUrl: string | null      // NEW
}
```

### `next.config.mjs`
Ensure ffmpeg binaries ship with the function:
```js
const nextConfig = {
  outputFileTracingIncludes: {
    'app/api/compose/route': [
      './node_modules/@ffmpeg-installer/**/*',
      './node_modules/@ffprobe-installer/**/*',
    ],
  },
}
```
Verify on first Vercel preview deploy. If libass missing in shipped binary, fall back path = swap `subtitles` filter for `drawtext` per-line (much uglier; track as follow-up).

### Font for libass (optional)
Bundle `Inter-Bold.ttf` (or similar) in `assets/fonts/`. Pass `fontsdir=` to subtitles filter. If skipped, libass falls back to a system font on Linux runtime — may render boring sans-serif but won't crash.

---

## Retry policy (Q16)
- Whisper alignment: 2 retries with 1s, 3s backoff. Then fail with sceneId in error.
- ElevenLabs voiceover: same.
- ffmpeg encode: no retry (deterministic; failure = bug). Fail loud with stderr in error event.

## Edge cases
- Story has 0 scenes: button disabled.
- Voiceover MP3 is empty/corrupt: Whisper returns no words → caption is just the raw text without karaoke (single block, no `\k`).
- Final video > Blob size limit (~500MB unlikely at 60s/1080p, but possible): catch, surface error.
- User leaves page mid-compose: server keeps running (best-effort), result lost. Refresh on return won't reconnect (would need job queue). Acceptable for MVP.
- ffmpeg /tmp full: cleanup in `finally` block, but if request killed mid-run, leftover files remain. Acceptable; Vercel functions are ephemeral.

## Out of scope
- Resumable composes
- Custom music/SFX
- Multiple output resolutions
- Vertical (9:16) variant
- Caption style picker UI (style is constant in code per Q13)

## Test plan
- [ ] Deploy preview: verify ffmpeg binary ships, runs `ffmpeg -version` in a one-off test endpoint
- [ ] libass support: confirm via `ffmpeg -filters | grep subtitle` or just running the burn step
- [ ] Single scene story: produces a ~3s video, captions visible, karaoke highlights word-by-word
- [ ] Full 10-scene story: total runtime <60s output, compose takes <2min, audio in sync
- [ ] Refresh after compose: player + download button restored
- [ ] Force a Groq 500 (block in network): retry kicks in, succeeds second try
- [ ] Force a permanent fail (bad audio): SSE error event surfaces sceneId

## Estimated LOC
~700 across 5 new lib files + 1 new endpoint + 1 new component + edits to page.tsx + config.

## Risk list
- **libass availability on Vercel runtime** — biggest unknown. Plan B: drawtext.
- **Function bundle size** — ffmpeg ~50MB, ffprobe ~30MB. Total bundle should fit Vercel 250MB unzipped limit.
- **Memory under 1080p encode** — Vercel functions max 3GB. Encoding 1920x1080 with libx264 fast preset ≈ 200-400MB peak. Fine.
- **Timeout under 300s** — 10-scene story encoding serially: probe (1s) + alignment (5s parallel) + encode (30-40s) + concat (5s) + subtitle burn (15s) + upload (5s) ≈ 70-90s typical. Headroom OK.
