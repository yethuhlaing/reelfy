# 06 — Orchestration & 5-Stage Pipeline

Lives at `features/lofi/server/lofi-orchestrator.ts`. Handles fan-out, fan-in gate, retry logic, stage transitions.

## 5 stages

```
1. Plan      (sync, browser)   — vibe → expand → edit → confirm
2. Fan-out   (sync server)     — pre-auth credits, create asset rows, submit all fal jobs in parallel
3. Gate      (async webhooks)  — each asset webhook updates row + checks "all siblings done?"
4. Arrange   (sync server)     — last webhook triggers: build plan, submit render
5. Finalize  (async webhook)   — render webhook: save final URL, settle credits, mark complete
```

## Stage 1: Plan

Handled by [04-prompt-expander.md](04-prompt-expander.md). No DB writes until user confirms.

## Stage 2: Fan-out launch

Route: `POST /api/lofi/generate`

```ts
async function launchVideo(input: GenerateInput, userId: string) {
  // 1. Cost calc
  const totalCredits = calculateTotalCredits(input)

  // 2. Atomic credit pre-auth
  const charged = await chargeCredits({ userId, amount: totalCredits })
  if (!charged) throw new InsufficientCreditsError()

  // 3. Create video + stories mirror row
  const videoId = nanoid()
  const storyId = nanoid()
  await db.transaction(async (tx) => {
    await tx.insert(stories).values({ id: storyId, userId, category: 'lofi', status: 'draft', title: input.suggestedTitle, tagline: input.vibe.slice(0,120), protagonist: '' })
    await tx.insert(lofiVideos).values({ id: videoId, userId, storyId, ...input, status: 'generating', creditsPreAuth: totalCredits })
  })

  // 4. Create asset rows for all music + visual prompts
  const assetRows = buildAssetRows(videoId, input)
  await db.insert(lofiAssets).values(assetRows)

  // 5. Fan-out fal submits in parallel
  const baseUrl = process.env.PUBLIC_BASE_URL
  await Promise.all(assetRows.map(async (row) => {
    try {
      const provider = row.kind === 'music' ? getMusicProvider(row.model) : null
      const result = row.kind === 'music'
        ? await provider!.submit({ prompt: row.prompt, durationSec: row.durationSec, webhookUrl: `${baseUrl}/api/webhooks/fal/music/${row.id}` })
        : await submitVisual(row, baseUrl)
      await db.update(lofiAssets).set({ falJobId: result.jobId, status: 'submitted', costUsd: String(result.estimatedCostUsd) }).where(eq(lofiAssets.id, row.id))
    } catch (err) {
      await markAssetFailed(row.id, err)
      // do not throw — let gate logic handle below threshold
    }
  }))

  return { videoId, storyId }
}
```

## Stage 3: Gate (per-asset webhook)

Route: `POST /api/webhooks/fal/music/[jobId]` and `.../visual/[jobId]` (or shared single endpoint discriminating on kind).

```ts
async function handleAssetWebhook(assetId: string, body: FalWebhookPayload) {
  // 1. Idempotency — ignore if already terminal
  const asset = await db.query.lofiAssets.findFirst({ where: eq(lofiAssets.id, assetId) })
  if (!asset || ['ready', 'skipped'].includes(asset.status)) return

  // 2. Update asset based on payload
  if (body.status === 'ERROR' || body.error) {
    if (asset.retryCount < MAX_RETRIES) {
      await retryAsset(asset)
      return
    }
    await db.update(lofiAssets).set({ status: 'failed', errorMessage: extractError(body) }).where(eq(lofiAssets.id, assetId))
  } else {
    const url = await downloadToBlob(extractResultUrl(body))
    await db.update(lofiAssets).set({ status: 'ready', resultUrl: url }).where(eq(lofiAssets.id, assetId))
  }

  // 3. Fan-in check
  await maybeAdvanceVideo(asset.videoId)
}
```

### Fan-in atomic gate

Avoids race when last 2 webhooks land simultaneously:

```ts
async function maybeAdvanceVideo(videoId: string) {
  const counts = await db
    .select({
      total: sql<number>`count(*)`,
      done:  sql<number>`count(*) filter (where status in ('ready','failed','skipped'))`,
      ready: sql<number>`count(*) filter (where status = 'ready')`,
    })
    .from(lofiAssets)
    .where(eq(lofiAssets.videoId, videoId))

  const { total, done, ready } = counts[0]
  if (done < total) return  // not all done yet

  // All assets terminal. Decide proceed vs fail.
  const successRate = ready / total
  if (successRate < 0.8) {
    await failVideoAndRefund(videoId)
    return
  }

  // Atomic claim: only one webhook wins
  const claimed = await db
    .update(lofiVideos)
    .set({ status: 'rendering' })
    .where(and(eq(lofiVideos.id, videoId), eq(lofiVideos.status, 'generating')))
    .returning({ id: lofiVideos.id })

  if (claimed.length === 0) return  // another webhook already advanced

  // 4. Trigger stage 4
  await runArrangementAndRender(videoId)
}
```

## Stage 4: Arrange + render

Called in-process from `maybeAdvanceVideo`. Synchronous within the request — fal compose submit returns quickly, the actual render happens server-side at fal.

```ts
async function runArrangementAndRender(videoId: string) {
  const video = await loadVideo(videoId)
  const readyAssets = await db.query.lofiAssets.findMany({ where: and(eq(lofiAssets.videoId, videoId), eq(lofiAssets.status, 'ready')) })

  const plan = buildArrangementPlan(video, readyAssets)
  await db.update(lofiVideos).set({ arrangementJson: JSON.stringify(plan) }).where(eq(lofiVideos.id, videoId))

  const filter = buildFilterGraph(plan)
  const { jobId } = await submitFalCompose({ inputs: plan.allUrls, filterComplex: filter, webhookUrl: `${baseUrl}/api/webhooks/fal/lofi-render/${videoId}` })
  // jobId tracked transiently — we look up video by id in webhook path
}
```

## Stage 5: Finalize

Route: `POST /api/webhooks/fal/lofi-render/[videoId]`

```ts
async function handleRenderWebhook(videoId: string, body) {
  if (body.status === 'ERROR') {
    await db.update(lofiVideos).set({ status: 'failed', errorMessage: extractError(body) }).where(eq(lofiVideos.id, videoId))
    await refundRenderCredits(videoId)
    return
  }
  const blobUrl = await downloadToBlob(body.output_url)
  const video = await loadVideo(videoId)
  await db.transaction(async (tx) => {
    await tx.update(lofiVideos).set({ status: 'complete', finalVideoUrl: blobUrl, finalDurationSec: video.targetDurationSec }).where(eq(lofiVideos.id, videoId))
    await tx.update(stories).set({ composedVideoUrl: blobUrl, status: 'complete' }).where(eq(stories.id, video.storyId))
  })
  await settleCredits(videoId)  // see 07-pricing-credits.md
}
```

## Cancellation

`POST /api/lofi/videos/[id]/cancel`

- Update `lofiVideos.status='aborted'`
- Late asset webhooks check status — if aborted, do nothing (don't even download to blob to save egress)
- Refund: full pre-auth minus assets already `ready` (those are user's to keep / could allow restart from arrangement step)
- Note: fal jobs in flight can't be cancelled mid-gen on fal side (no cancel API); just ignore their results

## Webhook authentication

Existing pattern in `app/api/webhooks/fal/animate/[jobId]/route.ts` validates source. Reuse same `assertFalWebhookValid` helper for new webhooks.
