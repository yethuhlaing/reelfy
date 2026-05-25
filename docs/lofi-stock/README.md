# Lofi-Stock Pipeline — Low-Cost Variant

Sibling to the AI lofi pipeline at [../lofi/](../lofi/README.md). Same end product (1-2hr lofi video on YouTube), but:

- **Audio:** royalty-free tracks fetched from Pixabay API (no fal music gen). User browses + selects.
- **Visuals:** AI-generated image(s) or video clip(s) — same as AI lofi pipeline.
- **Arrangement + render:** identical to AI lofi (fal-ai/ffmpeg-api compose).

Net effect: ~90% cheaper per video, faster generation (no music gen step), but limited to Pixabay catalog vibe.

## Cost comparison (1hr video)

| | AI lofi | Lofi-stock |
|---|---------|------------|
| Music | 20 × minimax = 100 cr (~$2.00) | 0 cr ($0.00) |
| Visual | 1 × flux-schnell = 1 cr | 1 × flux-schnell = 1 cr |
| Render | 5 cr | 5 cr |
| **Total** | **106 cr (~$2.50)** | **6 cr (~$0.50)** |

## Reading order

1. [00-overview.md](00-overview.md) — locked decisions + differences vs AI lofi
2. [01-audio-source.md](01-audio-source.md) — Pixabay API integration
3. [02-selection-ux.md](02-selection-ux.md) — browse/preview/pick UI
4. [03-data-model.md](03-data-model.md) — schema reuse + additions
5. [04-pipeline-reuse.md](04-pipeline-reuse.md) — what reuses AI lofi, what differs
6. [05-licensing.md](05-licensing.md) — Pixabay licence terms + attribution policy
7. [06-implementation-order.md](06-implementation-order.md) — PR sequence

## High-level flow

```
User vibe / search query
   ↓
Pixabay search API  →  Grid of preview-able tracks
   ↓
User clicks N tracks → selection list
   ↓
[Optional] Gemini expands vibe → visual prompts
   ↓
Credit pre-auth (visual + render only) → Submit
   ↓
Parallel: K visual fal jobs   |   Mirror selected stock track URLs into lofiAssets
   ↓
Visual webhooks → fan-in gate (only waits on visuals; stock tracks ready immediately)
   ↓
Arrangement engine (reuses AI lofi code, stock URLs as inputs)
   ↓
Render via fal ffmpeg-api → final MP4
```
