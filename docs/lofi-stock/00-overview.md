# 00 — Overview & Decisions

## Differences vs AI lofi

| Concern | AI lofi | Lofi-stock |
|---------|---------|------------|
| Music origin | fal.ai music models | Pixabay royalty-free catalog |
| Music cost | $0.01-$0.10 per loop | $0.00 |
| Music selection | User edits AI prompts | User browses + picks tracks |
| Visual gen | AI (fal flux/kling/etc) | AI (same) |
| Arrangement | Crossfade JSON plan | Crossfade JSON plan (same) |
| Render | fal-ai/ffmpeg-api compose | fal-ai/ffmpeg-api compose (same) |
| Pipeline stages | 5 | 5 (stock-music stage is sync — no fan-out for music) |
| Min credits/video | ~106 | ~6 |
| Failure modes | Music gen can fail | Pixabay API rate limit / track removed |

## Locked decisions

| # | Branch | Decision |
|---|--------|----------|
| 1 | Audio source | Pixabay Music API (CC0-style, no attribution required) |
| 2 | Selection UX | In-page browser with search, audio preview, multi-pick |
| 3 | Caching strategy | Cache track URLs in DB at submit; do NOT re-host audio (Pixabay URLs are long-lived) |
| 4 | Visual gen | Reuse AI lofi visual modes (4 modes, same registries) |
| 5 | Arrangement | Reuse AI lofi `arrangement.ts` unchanged — operates on URLs regardless of source |
| 6 | Data model | Reuse `lofiVideos` + `lofiAssets`. New asset.kind='stock-music'. Add `sourceProvider`, `sourceTrackId`, `sourceLicence` columns to lofiAssets |
| 7 | Category routing | New category `lofi-stock`. URL: `/lofi-stock/new`, `/lofi-stock/story/[id]`. Same form picker pattern |
| 8 | Pricing | Per-asset same model. Stock tracks = 0 cr. Visuals + render unchanged |
| 9 | Licensing display | Show "Music from Pixabay" credit overlay in final video (optional — Pixabay does not require but good practice) |
| 10 | Pre-listening | Users must be able to play 30s preview before adding to selection |

## Non-goals

- Mixing AI-gen + stock tracks in same video (post-MVP — would mean two music models per video)
- Multi-provider stock (just Pixabay for MVP — Freesound/Jamendo later if licence tracking added)
- Audio editing in-browser (trim, fade) — picked tracks used as-is

## Risks

- **Pixabay rate limits:** 100 requests/60s per API key per their docs. Cache search results aggressively in Upstash redis (TTL 1h)
- **Track removal:** Pixabay can remove tracks. Cached URL may 404 later. Mitigation: at render time, validate each URL with HEAD; if 404, swap for fallback from a cached "evergreen" pool
- **Search quality for "lofi" specifically:** Pixabay catalog uneven — test query coverage in PR 0
- **Licence drift:** Pixabay content licence may change. Snapshot licence text into `lofiAssets.sourceLicence` at pick time for audit trail

## Quick estimate

- ~3-4 days build on top of AI lofi pipeline being merged
- Net new files: ~6 (API route + provider + UI components)
- DB delta: 3 new columns on `lofiAssets`
