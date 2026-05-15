# PR 1 — Persistence + Voiceover Blob Storage

## Goal
Refresh stops losing work. Stories + voiceovers survive page reload. Foundation for PR 2 and PR 3.

## User-visible outcomes
- Refresh the tab → last story restored automatically.
- Left panel below StoryInput shows "Recent stories" list (up to 5), click to switch.
- Each item has small `×` to delete.
- Previously-played voiceovers play instantly on refresh (no re-TTS).

## Architectural change
- `/api/voiceover` stops returning raw audio bytes. Returns JSON `{ url, sceneId }` pointing at Vercel Blob.
- Client uses returned URL to construct `Audio` element.
- StoryData persisted in localStorage with stable Blob URLs (no `blob:` URLs).

---

## File changes

### `lib/types.ts`
Add `voiceoverUrl` to `Scene`:
```ts
export interface Scene extends ScenePlan {
  imageUrl: string | null
  voiceoverUrl: string | null   // NEW
}
```

### `lib/storage.ts` (NEW)
LocalStorage helpers. Keys:
- `stickman:list` → `Array<{ id: string; title: string; tagline: string; savedAt: number }>` (newest first, cap 5)
- `stickman:story:<id>` → `{ storyInput, options, storyData }`

Exports:
```ts
export interface StoredStorySummary { id: string; title: string; tagline: string; savedAt: number }
export interface StoredStory {
  id: string
  storyInput: string
  options: { density: SceneDensity; style: StickStyle; tone: VoiceTone }
  storyData: StoryData
  savedAt: number
}

export function listStories(): StoredStorySummary[]
export function getStory(id: string): StoredStory | null
export function saveStory(input: Omit<StoredStory, 'id' | 'savedAt'>): StoredStory  // returns w/ id+ts; evicts >5
export function updateStoryScene(id: string, sceneId: string, patch: Partial<Scene>): void
export function deleteStory(id: string): void
export function latestStoryId(): string | null
```

Implementation notes:
- Wrap all reads/writes in `try/catch` (quota, SSR).
- SSR-safe: `typeof window === 'undefined'` short-circuit returns null/empty.
- Eviction: when saving and list len === 5, drop oldest, also remove `stickman:story:<droppedId>`.

### `app/api/voiceover/route.ts` (CHANGE)
Replace in-memory cache + raw-bytes response with Blob upload + URL response.
```ts
import { put } from '@vercel/blob'
import { generateVoiceover } from '@/lib/elevenlabs'

export async function POST(request: Request) {
  const { text, sceneId, storyId } = await request.json()
  if (!text || !sceneId || !storyId) return badRequest()

  const audioBuffer = await generateVoiceover(text)
  const path = `voiceovers/${storyId}/${sceneId}.mp3`
  const { url } = await put(path, Buffer.from(audioBuffer), {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false,           // deterministic path, idempotent regen
    allowOverwrite: true,
  })
  return Response.json({ url, sceneId })
}
```
Fallback when `BLOB_READ_WRITE_TOKEN` missing: return base64 data URL (matches existing image fallback pattern in `/api/generate`).

### `app/page.tsx` (CHANGE)
1. **Hydrate on mount**: read `latestStoryId()` → `getStory(id)` → setState if present.
2. **storyId state**: every `/api/generate` run gets a new `crypto.randomUUID()`. Stored alongside storyData; passed to `/api/voiceover` call.
3. **Save after generate completes**: on `complete` SSE event, `saveStory({ id: storyId, storyInput, options, storyData })`.
4. **playScene rewrite**:
   - If `scene.voiceoverUrl` already set → use it directly.
   - Else POST `/api/voiceover` → receive `{ url }` → set into state via `updateStoryScene` + setStoryData mutator → audio plays that URL.
   - Drop the `audioCache` Map entirely (URLs are the cache now).
5. **Recent stories panel**: render below StageList. Click → load that story id into state (storyData + storyInput + options).
6. **Delete handler**: `deleteStory(id)`, refresh local list.

### `components/RecentStories.tsx` (NEW)
Props: `currentStoryId | null`, `onSelect(id)`, `onDelete(id)`.
Renders list from `listStories()`, highlights currentStoryId, item shape:
```
┌──────────────────────────┐
│ Story title (1 line)  × │
│ Tagline preview...        │
│ 2h ago                    │
└──────────────────────────┘
```

### `app/globals.css`
Append styles for `.recent-stories`, `.recent-story-item`, `.recent-story-delete`. Match existing left-panel aesthetic.

---

## Edge cases
- localStorage quota exceeded (rare with URL-only payloads, but possible): catch + show inline warning, skip save.
- Same scene voiceover requested twice in flight: client de-dupes via in-flight promise map.
- Blob token missing in dev: fall back to data URL, but warn that persistence won't survive cross-browser (data URLs are huge in localStorage — consider skipping save in that case).
- Story id collision on refresh: storyId persisted with storyData; reused on resume so additional voiceover calls land at same Blob path.

## Out of scope
- Cross-device sync (server DB) — explicitly skipped (Q1 = local-only).
- Multi-tab conflict resolution — last write wins.

## Test plan
- [ ] Fresh load → no story shown, recent list empty
- [ ] Generate story, refresh → same story restored
- [ ] Generate 6 stories → list caps at 5, oldest evicted
- [ ] Click old story → loads, scenes render with cached Blob URLs (no regen)
- [ ] Play voiceover → check Network tab calls `/api/voiceover` once; refresh + replay → no `/api/voiceover` call
- [ ] Delete a story → list updates, Blob assets orphaned (acceptable for MVP; cleanup later)
- [ ] No `BLOB_READ_WRITE_TOKEN` → data URL fallback works locally

## Estimated LOC
~250 added across 4 files + 1 new + 1 new component.
