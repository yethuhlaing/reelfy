# PR 2 — Thumbnail Generator

## Goal
Lazy "movie-poster" cover frame for each story. Hero stickman pose + baked-in title text + 1 dramatic FX. Same comic style as scenes. Used as cover above scene grid AND as intro card in PR 3 final video.

## Depends on
PR 1 (uses `storyId` + persistence + Blob fallback pattern).

## User-visible outcomes
- Empty slot above scene grid says "Generate cover" with a button.
- Click → SSE → thumbnail renders inline in ~5-10s.
- Slot persists across refresh (URL stored in StoryData manifest).
- Small `↻ Regenerate` button on filled slot.

---

## File changes

### `lib/types.ts`
```ts
export interface StoryData {
  title: string
  tagline: string
  protagonist: string                  // already present after recent gemini.ts changes
  thumbnailPrompt: string              // NEW — comes from planStory
  thumbnailUrl: string | null          // NEW — set after thumbnail gen
  scenes: Scene[]
}

export type StreamEvent =
  // ...existing...
  | { type: 'thumbnail-prompt'; prompt: string }   // NEW — emitted from /api/generate after planning
  | { type: 'thumbnail-image'; url: string }       // NEW — emitted from /api/thumbnail
  | { type: 'thumbnail-error'; error: string }     // NEW
```

### `lib/gemini.ts` (CHANGE)
Extend the JSON schema in `buildPlanPrompt`:
```
"thumbnailPrompt": string  // 100-180 words, see THUMBNAIL RULES
```

Add `THUMBNAIL RULES` block:
```
============================================================
THUMBNAIL PROMPT — REQUIRED CONTENT (100-180 words):

Goal: single hero "movie poster" frame summarizing the WHOLE story arc.

Must include, in this order:
1. Opening: "Use the same stickman character as before: <protagonist>."
2. HERO POSE: dramatic, embodies arc resolution (typically triumph/determination/hope). Centered or rule-of-thirds.
3. KEY PROPS: 1-3 most iconic items from across all scenes (e.g. laptop + rocket + lightbulb).
4. ONE BIG FX: sunburst behind character, upward arrow, sparkle explosion, fire flames, OR dollar-sign rain. Single dominant FX, not the multi-FX of scene panels.
5. TITLE TEXT BAKED IN: render the story title large at TOP of frame in bold hand-lettered uppercase ink. Title text MUST match: "<TITLE>" (quote verbatim). Place inside a torn-paper banner or bold ink rectangle.
6. TAGLINE TEXT BAKED IN: render the tagline at BOTTOM smaller, hand-lettered. Quote verbatim: "<TAGLINE>".
7. STYLE LOCK: same color palette as scenes (2-3 flat accent colors), thick ink lines, 16:9, NO frame/border/panel outline, bleed to edges.

The frame should read instantly — recognizable in a thumbnail grid at 200px wide.
```

Update `planStory()` return type:
```ts
Promise<{ title: string; tagline: string; protagonist: string; thumbnailPrompt: string; scenes: ScenePlan[] }>
```

### `app/api/generate/route.ts` (CHANGE)
After plan parsed, emit `thumbnail-prompt` event before scene image gen:
```ts
send({ type: 'story', title: plan.title, tagline: plan.tagline })
send({ type: 'thumbnail-prompt', prompt: plan.thumbnailPrompt })
// ...rest unchanged...
```
Do NOT generate thumbnail eagerly. Just expose the prompt. Client decides when.

### `app/api/thumbnail/route.ts` (NEW)
Single-shot endpoint. POST `{ storyId, prompt }` → returns `{ url }`.
```ts
import { put } from '@vercel/blob'
import { generateSceneImage } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const { storyId, prompt } = await request.json()
  if (!storyId || !prompt) return badRequest()

  const { mimeType, data } = await generateSceneImage(prompt)
  const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
  const { url } = await put(`thumbnails/${storyId}.${ext}`, data, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return Response.json({ url })
}
```
Data-URL fallback when no Blob token (mirror existing pattern).

### `components/ThumbnailSlot.tsx` (NEW)
Props:
```ts
{
  storyId: string | null
  prompt: string | null
  url: string | null
  onGenerated: (url: string) => void
}
```

Visual states:
1. **No story yet** → render nothing.
2. **Prompt exists, no url, idle** → empty 16:9 card, big "Generate Cover" button.
3. **Generating** → skeleton + spinner + "Generating cover…"
4. **Filled** → `<img>` + small floating "↻ Regenerate" button top-right.

On generate click: POST `/api/thumbnail` with `{ storyId, prompt }`. On success, call `onGenerated(url)`.

### `app/page.tsx` (CHANGE)
1. Track `thumbnailPrompt` in `storyData` (comes from `thumbnail-prompt` SSE event).
2. Handle new SSE event types in switch.
3. Render `<ThumbnailSlot>` above the tabs/scene-grid in right panel.
4. `onGenerated`: setStoryData with `thumbnailUrl`, call `updateStory(storyId, { storyData })` via storage helpers.
5. Hydration: include `thumbnailUrl` in restored state.

### `lib/storage.ts` (CHANGE)
Add helper:
```ts
export function updateThumbnail(id: string, url: string): void
```
Updates `storyData.thumbnailUrl` for the stored story.

### `app/globals.css`
Append styles for `.thumbnail-slot`, `.thumbnail-empty`, `.thumbnail-image`, `.thumbnail-regen-btn`.

---

## Edge cases
- User regenerates while one is in flight: disable button until response or error.
- Plan didn't include `thumbnailPrompt` (older saved stories from before this PR): slot shows but with "Cover generation not available — re-run story" hint. Don't crash.
- Image gen fails: SSE `thumbnail-error`, slot shows red error + retry button.

## Out of scope
- Multiple thumbnail variations / "pick best of 3".
- Editable title text overlay.
- Custom upload of own cover.

## Test plan
- [ ] Generate new story → `thumbnailPrompt` appears in storyData (verify via React DevTools or console.log)
- [ ] Empty slot rendered with Generate button
- [ ] Click Generate → spinner → image lands → slot fills
- [ ] Refresh → thumbnail persists
- [ ] Old story (from before PR 2): slot hidden or hint shown, no crash
- [ ] Regenerate replaces image at same Blob path (idempotent path = old image overwritten)
- [ ] Title text in image is legible and matches `storyData.title`

## Estimated LOC
~180 across 4 changed files + 1 new endpoint + 1 new component.
