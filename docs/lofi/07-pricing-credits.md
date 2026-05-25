# 07 — Pricing & Credits

Per-asset pricing model matching the existing stickman pattern (see [shared/lib/db/credits.ts](../../shared/lib/db/credits.ts)). Total cost previewed in UI before user confirms; charged atomically at fan-out launch.

## Pricing table (MVP defaults)

### Music
| Model | Credits/loop | Cost/loop USD |
|-------|--------------|---------------|
| minimax | 5 | $0.10 |
| stable-audio | 2 | $0.05 |
| cassette | 1 | $0.01 |

### Visual
| Model | Kind | Credits/asset | Cost/asset USD |
|-------|------|---------------|----------------|
| flux-schnell | image | 1 | $0.003 |
| gemini-2.5-flash-image | image | 2 | $0.01 |
| flux-pro | image | 5 | $0.05 |
| ltx-video | video (5-10s) | 5 | $0.10 |
| longcat | video | 10 | $0.20 |
| kling 2.6 pro | video | 25 | $0.50 |

### Render (fal compose)
- Flat **5 credits** per video render. Cost ~$0.30-0.60 depending on duration.

### Prompt expand (gemini)
- Free (absorbed). ~$0.001. Add 1cr if abused.

## Sample bill — 1hr lofi with minimax + single flux-schnell image

| Item | Qty | Credits | USD |
|------|-----|---------|-----|
| minimax loop | 20 | 100 | $2.00 |
| flux-schnell image | 1 | 1 | $0.003 |
| render | 1 | 5 | $0.50 |
| **Total** | | **106** | **$2.50** |

## Sample bill — 2hr premium (kling + multi-video)

| Item | Qty | Credits | USD |
|------|-----|---------|-----|
| minimax loop | 40 | 200 | $4.00 |
| kling video clip | 8 | 200 | $4.00 |
| render | 1 | 5 | $0.50 |
| **Total** | | **405** | **$8.50** |

## Cost preview UI

LofiForm shows live breakdown above the Generate button:

```
Music   20 × minimax        100 credits
Visual  1 × flux-schnell      1 credit
Render                        5 credits
─────────────────────────────────────────
Total                       106 credits   (Your balance: 850)
                            [Generate]
```

If balance < total: button disabled, link to `/pricing`.

## Pre-auth at fan-out

Use existing `chargeCredits({ userId, amount: totalCredits })` from [shared/lib/db/credits.ts](../../shared/lib/db/credits.ts). Atomic — returns false if insufficient.

```ts
const charged = await chargeCredits({ userId, amount: totalCredits })
if (!charged) {
  return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
}
// store on lofiVideos.creditsPreAuth for refund accounting
```

## Settlement at finalize

After successful render, recalculate actual credits used = sum of `lofiAssets.creditsCharged` (where status='ready') + 5cr render. Diff vs pre-auth = refund.

```ts
async function settleCredits(videoId: string) {
  const video = await loadVideo(videoId)
  const assetSum = await db
    .select({ sum: sql<number>`coalesce(sum(credits_charged), 0)` })
    .from(lofiAssets)
    .where(and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'ready')))
  const settled = (assetSum[0].sum ?? 0) + RENDER_CREDITS
  const refund = video.creditsPreAuth - settled
  if (refund > 0) {
    await refundCredits({ userId: video.userId, amount: refund, reason: `lofi_settle_${videoId}` })
  }
  await db.update(lofiVideos).set({ creditsSettled: settled }).where(eq(lofiVideos.id, videoId))
}
```

Each asset's `creditsCharged` is set when the asset's webhook lands successfully (so failed/skipped assets contribute 0).

## Refund scenarios

| Outcome | Refund |
|---------|--------|
| All assets ready, render success | pre-auth - (asset_sum + render) — non-zero only if pricing pre-calc has slack |
| Render fails | refund render credits (5cr) only; assets keep their charge (user has them for retry) |
| Asset gate fails (< 80% success) | refund (pre-auth - sum of ready asset credits). Assets kept for partial retry. |
| User cancel | refund (pre-auth - sum of already-ready asset credits) |

## Cost logging

Use existing `apiCostLogs` table via `cost-logger.ts`. Log each fal call (music + visual + render) with provider, model, cost, and videoId for admin dashboard analytics.
