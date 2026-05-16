# UI-PR3 — `/[category]/new` Redesign (Advanced disclosure, no alerts)

Goal: Replace inline 7-config dump with focused textarea + Generate button. All configs visible behind "Advanced ▸" disclosure (closed by default). Remove `alert()` failure path.
Depends on: UI-PR1.

## Why
- Current StoryInput shows 7 selects always-on → overwhelming. User wants fewer visible controls but still wants every config accessible before generate (not buried in settings).
- `alert(msg)` on generate failure breaks SaaS feel.
- Need explicit post-submit transition to `/[category]/story/[id]` for the new loading UX (UI-PR7).

## Changes

### 1. Page shell
File: `app/[category]/new/page.tsx`

- Two-section vertical stack:
  - Top: header w/ category badge + "New Story" title
  - Form: textarea + Advanced disclosure + Generate button + error banner

### 2. Story form
New file: `components/StoryForm.tsx`

- Textarea (full width, ~12 rows). Placeholder = current founder-prompt copy (stickman category keeps current copy as user instructed).
- Below textarea: `Advanced ▸` toggle (closed default). Open state animates collapse.
- `<AdvancedConfig />` rendered inside disclosure.
- `Generate Story` primary button bottom. Disabled when:
  - textarea empty/whitespace
  - active submit in flight
- Inline error banner (red bg, dismissible) above Generate when submit fails. Never use `alert()`.

### 3. Advanced config
New file: `components/AdvancedConfig.tsx`

Pulls all 7 selects from existing `StoryInput`:
- Scene Density (13 options)
- Stick Style (3)
- Voice Tone (4)
- Script Model (8)
- Image Model (3)
- Video Model (3)
- Video Quality (2)

Layout: 2-col grid on desktop, 1-col mobile. Each group: label + select + small helper hint.

Tooltips on labels for first-time users:
- Density: "How many scenes to plan"
- Script Model: "LLM used for script + scene planning"
- etc.

Defaults baked into `GenerateOptions` (already in code):
```ts
{ density: '12', style: 'expressive', tone: 'inspirational', textModel: 'gemini-2.5-flash', imageModel: 'flux-schnell-fal', videoModel: 'ltx-video-fal', videoQuality: '1080p' }
```

Persist last-used config in `localStorage` key `new-story:options:[category]` so power users don't re-set every time.

### 4. Submit flow
- Reserve new story ID up-front (existing `newStoryId()` helper).
- `POST /api/generate` with config + story text (existing endpoint).
- On 200 response: persist initial empty story record via `saveStory(...)` then `router.push('/[category]/story/[id]')`. SSE stream is read **on the workspace page**, not here.

Wait — current implementation reads SSE inline on the page that calls fetch. To keep things clean, change pattern:
- New page submits → only kicks off the request and immediately navigates to workspace with a `?starting=1` flag.
- Workspace page opens SSE via a fresh `POST /api/generate` only if `starting=1`. Otherwise it just renders existing story.

Implementation note: this requires generate endpoint to be re-invokable per story ID, or to expose an "attach to existing generation" SSE stream. Simpler approach: keep the streaming on the new page until the first event arrives, then navigate. Two viable patterns — choose during impl:

**Pattern A (recommended):** Lift generation state into a context or workspace store. New page fires generation + navigates; workspace page resumes the in-memory stream via the store.

**Pattern B:** Workspace page itself owns generation. New page just persists prompt + options to a local pending record + navigates with flag `?starting=1`. Workspace reads pending, fires POST itself.

Pattern B is simpler and avoids state-handoff complexity. Use Pattern B.

### 5. Error handling
- Generate fetch fails → inline banner with message + `Try again` btn.
- Validation error before submit (e.g. story too short) → red helper under textarea.
- No `alert()` anywhere in this file.

### 6. Cost preview slot
- Add empty container above Generate button for future cost preview (skipped now per user decision).
- Class `cost-preview-slot` reserves vertical space (~24px) so layout doesn't shift when billing arrives.

## Files added
- `components/StoryForm.tsx`
- `components/AdvancedConfig.tsx`

## Files modified
- `app/[category]/new/page.tsx`
- `components/StoryInput.tsx` (delete or fully replace — old file removed)
- `app/[category]/story/[id]/page.tsx` (read `?starting=1` query, fire generation if set)
- `lib/storage.ts` (helper `savePendingStory(id, input, options, category)`)

## Verification
- New page loads with textarea only — no selects visible.
- Click "Advanced ▸" → all 7 configs render in 2-col grid.
- Defaults match existing app behavior.
- Change configs → reload page → configs persisted.
- Submit with empty textarea → button disabled.
- Submit with invalid story → inline banner appears, no browser alert.
- Submit valid → navigates to `/stickman/story/[id]?starting=1` immediately (don't wait for full SSE).
- Workspace picks up generation and streams without re-running it twice.
