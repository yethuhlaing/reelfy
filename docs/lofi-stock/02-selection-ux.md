# 02 — Selection UX

In-page browser. User searches Pixabay, previews tracks, multi-picks, then proceeds to visual config + submit.

## Component tree

```
features/lofi-stock/components/
  LofiStockForm.tsx              # top-level form
  StockTrackSearch.tsx           # search bar + paginated grid
  StockTrackCard.tsx             # one tile: title, tags, duration, play button, [Add] toggle
  SelectedTracksDrawer.tsx       # collapsible bottom panel showing picked tracks + total duration
  StockTrackPlayer.tsx           # ref-counted audio element for previews
```

## Flow

```
Step 1 — Vibe + duration + visual config
  (same fields as LofiForm, minus music model selection)
   ↓
Step 2 — Track browser
  Search bar with chips: [lofi] [rain] [piano] [chill] (presets)
  Grid of 12 cards per page, paginated
  Each card: title, tags, duration, play, Add/Remove toggle
  Bottom drawer: "Selected: 18 tracks, 56 min — need 60 min minimum"
   ↓
Step 3 — Visual prompt expand
  (Optional gemini call for visual prompts, same as AI lofi)
   ↓
Step 4 — Cost preview + Generate
```

## Selection rules

- User must pick ≥ N tracks where `sum(durationSec) >= targetDurationSec`
- No duplicate track IDs (UI prevents)
- No max — extra tracks just mean less repetition
- Recommended count = `ceil(targetDurationSec / 180)` (assumes ~3min avg track, played once each)

## Audio preview

- One global `<audio>` element ref-counted across cards (only one plays at a time)
- Click play on card B while A playing → pause A, play B
- 30s preview cap (auto-stop after 30s to avoid accidental long playback)
- For Pixabay: use `previewURL` (or `downloadURL` if no preview exists — most Pixabay music tracks expose only one URL)

## Search query UX

- Free-text search box, debounced 300ms
- Quick filter chips below: `lofi`, `rain`, `piano`, `chill`, `jazz`, `ambient`, `study`
- Clicking chip appends to query: `q=lofi+rain`
- Empty query default: pre-populated with `lofi` to give immediate results
- Pagination: "Load more" button (no infinite scroll — explicit, avoids accidental API hammering)

## Selected tracks drawer

Collapsible footer panel:
- Always visible if any tracks selected
- Lists picked tracks (title + duration) with re-order handles + remove × button
- Total duration vs target with progress bar
- If total < target: warning, disable Generate
- Reorder = sets `orderIndex` in `lofiAssets` (controls arrangement order)

## Form schema

```ts
type LofiStockFormState = {
  vibe: string
  targetDurationSec: number
  ambientBed: 'rain'|'vinyl'|'fireplace'|'cafe'|null
  visualMode: VisualMode
  visualModel: string
  visualAssets: Array<{ prompt: string; durationSec: number }>
  selectedTracks: Array<{
    id: string
    title: string
    durationSec: number
    downloadUrl: string
    licence: string
    tags: string[]
  }>
}
```

## Wireframe sketch

```
┌────────────────────────────────────────────────────────┐
│ Vibe: [rainy tokyo cafe at midnight              ]     │
│ Duration: (•) 1hr  ( ) 1.5hr  ( ) 2hr                  │
│ Ambient: (•) rain  ( ) vinyl  ( ) cafe                 │
│ Visual mode: [single-image ▼] Model: [flux-schnell ▼]  │
├────────────────────────────────────────────────────────┤
│ Browse music                                           │
│ [lofi rain                          🔍] [Search]       │
│ Chips: [lofi] [chill] [jazz] [piano] [+ambient]        │
│                                                        │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│ │ ▶ ♪  │ │ ▶ ♪  │ │ ▶ ♪  │ │ ▶ ♪  │                    │
│ │Title │ │Title │ │Title │ │Title │                    │
│ │3:24  │ │2:58  │ │4:11  │ │3:02  │                    │
│ │ [+]  │ │ [✓]  │ │ [+]  │ │ [✓]  │                    │
│ └──────┘ └──────┘ └──────┘ └──────┘                    │
│ ... 8 more                                             │
│           [ Load more ]                                │
├────────────────────────────────────────────────────────┤
│ Selected: 18 tracks · 56:23 / 60:00 ████████░ 94%      │
│   1. Mellow Piano Rain     3:24  ⋮⋮ [×]                │
│   2. Coffee Shop Vibes     2:58  ⋮⋮ [×]                │
│   ... 16 more                                          │
├────────────────────────────────────────────────────────┤
│ Cost preview                                           │
│ Visual 1×flux-schnell    1 cr                          │
│ Render                   5 cr                          │
│ Music                    0 cr (Pixabay free)           │
│ Total                    6 cr     Balance: 850         │
│                                                        │
│  [Need 3:37 more music]    [ Generate Video ]          │
└────────────────────────────────────────────────────────┘
```

## Edge cases

- User picks track, returns to search, picks same track again → UI shows "Added" not "Add", click removes
- API returns 0 results: empty-state with "Try different keywords" + chip suggestions
- Preview audio fails to load (CORS, removed): card shows error icon, disable Add
- User selects >> target duration: allow but warn "Last tracks will be unused — arrangement will trim to target"

## Accessibility

- Each card has aria-label with title + duration
- Play button has separate label from Add button
- Selected drawer announces total via aria-live
- Keyboard navigation: tab through cards, space to play, enter to add/remove
