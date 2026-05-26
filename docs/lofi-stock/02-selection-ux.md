# 02 — Selection UX

Hybrid 4-step flow: **Music** (songs only) → **Video** (vibe + length) → **Visuals** → **Review & generate**.

Music source: [Free To Use](https://freetouse.com/music) (`music-freetouse` provider).

## Component tree

```
features/lofi-stock/
  components/
    LofiStockForm.tsx           # shell: step state, handlers
    LofiStockStepHeader.tsx     # 1 Soundtrack · 2 Visuals · 3 Review
    StockTrackBrowser.tsx       # catalog: search, mood chips, tabs, categories
    StockTrackCard.tsx          # browse row: waveform, play, add
    StockPlaylistPanel.tsx      # sticky playlist column + continue CTA
    PlaylistDurationMeter.tsx   # progress bar + loop hint
    PlaylistTrackRow.tsx        # ordered row: play, reorder, remove
    StockVisualsStep.tsx        # visual prompts + advanced script model
    StockReviewStep.tsx         # summary + cost + generate
  lib/
    playlist-utils.ts           # formatMmSs, duration sum, recommendations
    constants.ts                # mood chips, categories, browse tabs
    expand-types.ts
```

## Flow

```
Step 1 — Music (split pane on lg+)
  Songs only — no vibe or video length
  Left: browse/search catalog + mood chips
  Right (sticky): Your playlist — total duration only, ordered tracks, Continue
  Mobile: compact playlist panel above catalog
   ↓
Step 2 — Video (max-w-3xl)
  Vibe + video length; playlist vs target meter shown here
   ↓
Step 3 — Visuals (max-w-3xl, auto expand on enter)
  Visual model + scene count + Advanced (script model)
  Editable visual prompts from Gemini
   ↓
Step 4 — Review
  Summary card, collapsed playlist, cost preview, Generate video
```

## Selection rules

- User must pick ≥ 1 track (no hard minimum total duration — arrangement loops to fill target)
- No duplicate track IDs (toggle add/remove)
- Recommended count = `ceil(targetDurationSec / 180)` shown in duration meter
- If `sum(duration) < target`: warn that tracks will loop; suggest adding more for variety
- Reorder via ↑/↓ sets `orderIndex` in `lofiAssets` (array order at submit)

## Audio preview

- `AudioPlayerProvider` wraps the form; one track plays at a time
- Play from catalog card or playlist row
- Waveform visualizer while playing (BarVisualizer)

## Search query UX

- Free-text search, debounced 400ms
- Mood chips: `lofi`, `chill`, `rain`, `piano`, `jazz`, `ambient`, `study`
- **Search from vibe** copies first 80 chars of vibe into search
- Browse tabs: Popular, New, Staff Picks, Random
- Category chips for curated genres
- Pagination: explicit Load more

## Playlist panel

- Sticky right column on `lg+` (`340px`)
- `PlaylistDurationMeter`: `selected / target` + progress bar + hint
- Ordered `PlaylistTrackRow` list (not chips)
- **Continue to visuals** (replaces single-page Expand Prompts)

## Wireframe (desktop step 1)

```
┌──────────────────────────────────────────────────────────────────┐
│ 1 Soundtrack · 2 Visuals · 3 Review                              │
│ Vibe: [.................................................]        │
│ Duration: [1 hr ▼]   ~20 tracks recommended                      │
├───────────────────────────────┬──────────────────────────────────┤
│ Browse stock music            │  Your playlist          12 tracks │
│ [search...................]   │  47:20 / 60:00  ████████░░       │
│ [lofi][chill][rain]...        │  Tracks will loop… add ~3 more   │
│ [Popular][New]...             │  1. ▶ Track A        ↑ ↓ ×       │
│ ┌ track card ─────────────┐   │  2. ▶ Track B        ↑ ↓ ×       │
│ └─────────────────────────┘   │  [ Continue to visuals ]         │
│ [ Load more ]                 │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

## Edge cases

- Toggle same track in catalog → remove from playlist
- Empty search → clear results, return to browse mode
- Back from visuals/review preserves playlist order and expand result
- Expand fails → return to playlist step with toast

## Accessibility

- Step nav: `aria-current="step"` on active step
- Progress bar: `role="progressbar"` with valuemin/now/max
- Playlist rows: separate aria-labels for play, reorder, remove
