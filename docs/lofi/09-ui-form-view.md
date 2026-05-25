# 09 — UI: LofiForm + LofiVideoView

Two new feature components. Route picker dispatches by `params.category`.

## Files

```
features/lofi/components/
  LofiForm.tsx                  # creation form
  LofiVideoView.tsx             # generated-video viewer
  LofiPromptList.tsx            # editable prompt list (used inside LofiForm after expand)
  LofiCostPreview.tsx           # live credit breakdown
  LofiProgress.tsx              # generation progress UI
```

## Route dispatch

[app/[category]/new/page.tsx](../../app/[category]/new/page.tsx)
```ts
const { category } = await params
return (
  <div className="flex flex-1 items-center justify-center px-6 py-8">
    <div className="w-full max-w-6xl">
      {category === 'lofi' ? <LofiForm /> : <StoryForm category={category} />}
    </div>
  </div>
)
```

Same pattern for [app/[category]/story/[id]/page.tsx](../../app/[category]/story/[id]/page.tsx) — `<LofiVideoView id={id} />` vs existing story view.

## LofiForm flow

```
┌────────────────────────────────────────┐
│ Vibe                                   │
│ [ rainy tokyo cafe at midnight       ] │
│                                        │
│ Target duration                        │
│ ( ) 1hr   (•) 1.5hr   ( ) 2hr          │
│                                        │
│ Music model                            │
│ [ minimax              ▼ ]             │
│ Loops: [30] (recommended for 1.5hr)    │
│                                        │
│ Ambient bed                            │
│ ( ) none (•) rain ( ) vinyl ( ) cafe   │
│                                        │
│ Visual mode                            │
│ [ multi-image            ▼ ]           │
│ Visual model                           │
│ [ flux-schnell           ▼ ]           │
│ # of assets: [3]                       │
│                                        │
│              [ Expand Prompts → ]      │
└────────────────────────────────────────┘
```

After clicking "Expand Prompts":

```
┌────────────────────────────────────────┐
│ Music prompts (30)         [↻ all]     │
│ ┌────────────────────────────┐ [↻] [×] │
│ │ Slow jazzy piano with rain │         │
│ └────────────────────────────┘         │
│ ┌────────────────────────────┐ [↻] [×] │
│ │ Mellow guitar fingerstyle  │         │
│ └────────────────────────────┘         │
│ ... 28 more (collapsed by default)     │
│                                        │
│ Visual prompts (3)                     │
│ ┌────────────────────────────┐         │
│ │ Tokyo cafe wide  [180s]    │         │
│ └────────────────────────────┘         │
│ ┌────────────────────────────┐         │
│ │ Window close-up [3600s]    │         │
│ └────────────────────────────┘         │
│ ┌────────────────────────────┐         │
│ │ Coffee detail   [1620s]    │         │
│ └────────────────────────────┘         │
│ ⚠ Total visual: 5400s = target ✓       │
│                                        │
│ ┌──────── Cost preview ────────┐       │
│ │ Music 30×minimax    150 cr   │       │
│ │ Visual 3×flux-schnell 3 cr   │       │
│ │ Render               5 cr    │       │
│ │ Total              158 cr    │       │
│ │ Balance:           850 cr    │       │
│ └──────────────────────────────┘       │
│                                        │
│         [ Generate Video ]             │
└────────────────────────────────────────┘
```

### State machine (client-side)

```
idle → expanding → editing → submitting → redirected
```

After successful `POST /api/lofi/generate`, redirect to `/lofi/story/[id]` where LofiVideoView polls status.

## LofiVideoView states

Status-driven rendering. Polls `GET /api/lofi/videos/[id]` every 5s while non-terminal.

| Video status | UI |
|--------------|----|
| `planning` | not reachable from this view (only after stage 2 launch) |
| `generating` | progress bar of asset gen: "12 / 30 music loops ready, 0 / 3 visuals ready". Per-asset failure surfaces with retry-individual button (optional MVP). [Cancel] button. |
| `gating` | "Compiling arrangement..." (brief transient state, may flash) |
| `rendering` | "Rendering video... (this can take 5-15 min)" with cancel button |
| `complete` | inline `<video>` player with finalVideoUrl, download button, "Generate similar" button |
| `failed` | error message + retry button (full retry for asset fail, render-only retry for render fail) |
| `aborted` | "Cancelled by user" + delete button |

## Cancel button

Calls `POST /api/lofi/videos/[id]/cancel`. Confirms via dialog. UI optimistically sets status='aborted'.

## Download

`finalVideoUrl` from Vercel Blob is publicly accessible — `<a href={url} download>` works. Filename derived from `stories.title` slugged.

## Generate similar

Clones the input config (vibe + duration + models + counts) to LofiForm pre-filled with same values; user can tweak + regenerate. Same prompts NOT re-used (gemini re-expands for variation).

## Dashboard integration

Existing dashboard at `/dashboard` lists `stories` rows. For `category='lofi'`, story card shows:
- title from stories.title
- thumbnail = either visual asset URL (first ready visual) OR generic lofi placeholder
- "lofi 1.5hr" badge
- click → `/lofi/story/[id]`

No new dashboard work needed if existing story card respects category badging.

## Accessibility / responsive

- Form: 1-column on mobile, 2-column above md
- Prompt list: virtualized if N > 50
- Progress numbers: aria-live region
