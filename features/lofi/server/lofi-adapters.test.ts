/**
 * Lofi adapter tests. The planner and the projections, plus the lifecycle they
 * drive when run through the kernel against in-memory fal and store — no Next
 * routes, no EventSource, no Redis.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  FakeCredits,
  FakeFalQueue,
  FakeMediaStore,
  FakeResultSink,
  FakeRunStore,
  fakeWebhookUrls,
} from '@/shared/lib/video-processing/fakes'
import { createVideoKernel } from '@/shared/lib/video-processing/kernel'
import type { Run, Step } from '@/shared/lib/video-processing/types'

import {
  assertLofiRenderable,
  buildAssetRows,
  createLofiPlanner,
  effectiveVisualMode,
  lofiPhaseForRun,
  lofiRetryOffer,
  lofiStatusForRun,
  lofiTarget,
  LOFI_RENDER_MODEL_ID,
  orphanedLofiStatus,
  readyLofiAssets,
  requiredMusicLoops,
  toLofiRunHydration,
  type GenerateInput,
  type LofiAssetRow,
} from './lofi-adapters'
import { RENDER_CREDITS } from './pricing'

const target = lofiTarget('u1', 'v1')

function assetRow(over: Partial<LofiAssetRow> & { id: string; kind: string }): LofiAssetRow {
  return {
    videoId: 'v1',
    orderIndex: 0,
    prompt: 'rainy tokyo rooftop',
    model: 'minimax',
    durationSec: 90,
    falJobId: null,
    status: 'pending',
    retryCount: 0,
    errorMessage: null,
    resultUrl: null,
    sourceProvider: null,
    sourceTrackId: null,
    sourceLicence: null,
    sourceAttribution: null,
    creditsCharged: 0,
    costUsd: '0',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...over,
  } as LofiAssetRow
}

function run(over: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    target,
    status: 'running',
    steps: [],
    creditsReserved: 0,
    creditsConsumed: 0,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  }
}

function step(over: Partial<Step> & { id: string; kind: Step['kind'] }): Step {
  return {
    stage: 0,
    status: 'pending',
    credits: 0,
    creditsConsumed: 0,
    ...over,
  } as Step
}

const visualConfig = (over: Partial<GenerateInput['visualConfig']> = {}) =>
  ({
    mode: 'multi-image',
    model: 'flux-schnell-fal',
    assets: [{ durationSec: 12 }, { durationSec: 12 }],
    ...over,
  }) as GenerateInput['visualConfig']

const generateInput = (over: Partial<GenerateInput> = {}): GenerateInput => ({
  vibe: 'rainy tokyo rooftop',
  targetDurationSec: 1800,
  musicModel: 'minimax',
  musicLoopCount: 2,
  visualConfig: visualConfig(),
  musicPrompts: ['loop one', 'loop two'],
  visualPrompts: ['a rooftop', 'a window'],
  suggestedTitle: 'Rainy rooftop',
  suggestedAmbientBed: null,
  ...over,
})

describe('buildAssetRows', () => {
  let n = 0
  const ids = () => `a${++n}`

  it('orders visuals after the music they follow', () => {
    n = 0
    const rows = buildAssetRows('v1', generateInput(), ids)

    assert.deepEqual(
      rows.map((row) => [row.kind, row.orderIndex]),
      [
        ['music', 0],
        ['music', 1],
        ['visual', 2],
        ['visual', 3],
      ],
    )
  })

  it('births a picked stock track ready, with its licence recorded', () => {
    n = 0
    const rows = buildAssetRows(
      'v1',
      generateInput({
        category: 'lofi-stock',
        musicModel: 'freetouse',
        musicPrompts: [],
        selectedTracks: [
          { id: 't1', title: 'Dust', mp3Url: 'https://ftu.test/dust.mp3', duration_sec: 123.4 },
        ],
      }),
      ids,
    )

    const track = rows[0]
    assert.equal(track.kind, 'stock-music')
    assert.equal(track.status, 'ready')
    assert.equal(track.resultUrl, 'https://ftu.test/dust.mp3')
    assert.equal(track.sourceTrackId, 't1')
    assert.equal(track.durationSec, 123)
    assert.equal(track.creditsCharged, 0)
  })
})

describe('createLofiPlanner', () => {
  function planner(assets: LofiAssetRow[]) {
    return createLofiPlanner({
      loadAssets: async () => assets,
      buildRenderInput: async () => ({ tracks: [] }),
    })
  }

  it('plans a Step per generated asset, then one render', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'music', orderIndex: 0 }),
      assetRow({ id: 'a2', kind: 'visual', orderIndex: 1, model: 'flux-schnell-fal' }),
    ]).plan(target)

    assert.deepEqual(
      plan.steps.map((s) => [s.kind, s.stage]),
      [
        ['asset', 0],
        ['asset', 0],
        ['render', 1],
      ],
    )
    assert.equal(plan.steps[2].endpoint, LOFI_RENDER_MODEL_ID)
    assert.equal(plan.steps[2].credits, RENDER_CREDITS)
  })

  it('points each Step back at the asset row it fills', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'music' }),
      assetRow({ id: 'a2', kind: 'visual', model: 'flux-schnell-fal' }),
    ]).plan(target)

    assert.deepEqual(
      plan.steps.map((s) => s.ref),
      ['a1', 'a2', undefined],
    )
  })

  it('leaves a stock track out: nothing is enqueued for a track that was picked', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'stock-music', status: 'ready', resultUrl: 'https://r2/1.mp3' }),
      assetRow({ id: 'a2', kind: 'visual', model: 'flux-schnell-fal' }),
    ]).plan(target)

    assert.deepEqual(
      plan.steps.map((s) => [s.kind, s.ref]),
      [
        ['asset', 'a2'],
        ['render', undefined],
      ],
    )
  })

  it('makes music optional and visuals required', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'music' }),
      assetRow({ id: 'a2', kind: 'visual', model: 'flux-schnell-fal' }),
    ]).plan(target)

    assert.equal(plan.steps[0].optional, true)
    assert.ok(!plan.steps[1].optional)
  })

  it('enqueues a still against the image model and a clip against the video model', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'visual', model: 'flux-schnell-fal' }),
      assetRow({ id: 'a2', kind: 'visual', model: 'ltx-video-fal' }),
    ]).plan(target)

    assert.equal(plan.steps[0].endpoint, 'fal-ai/flux/schnell')
    assert.equal(plan.steps[1].endpoint, 'fal-ai/ltx-video/image-to-video')
  })

  it('sends the music prompt and its length to fal', async () => {
    const plan = await planner([
      assetRow({ id: 'a1', kind: 'music', model: 'cassette', prompt: 'dusty keys', durationSec: 120 }),
    ]).plan(target)

    assert.equal(plan.steps[0].endpoint, 'fal-ai/cassetteai/music-generator')
    assert.deepEqual(await plan.steps[0].buildInput({ run: run(), previousResultUrls: [] }), {
      prompt: 'dusty keys',
      duration: 120,
    })
  })

  it('refuses a video with nothing to generate rather than planning an empty Run', async () => {
    await assert.rejects(() => planner([]).plan(target), /no assets/)
  })

  it('rejects a Target that is not a lofi video', async () => {
    await assert.rejects(
      () => planner([assetRow({ id: 'a1', kind: 'music' })]).plan({ kind: 'story', userId: 'u1', storyId: 's1' }),
      /planner received a story Target/,
    )
  })
})

describe('readyLofiAssets', () => {
  const assets = [
    assetRow({ id: 'a1', kind: 'music', orderIndex: 0, durationSec: 90 }),
    assetRow({ id: 'a2', kind: 'music', orderIndex: 1, durationSec: 90 }),
    assetRow({ id: 'a3', kind: 'visual', orderIndex: 2, durationSec: 12 }),
  ]

  it('reads results off the Steps, not off the rows the mirror has yet to write', () => {
    const ready = readyLofiAssets(
      assets,
      run({
        steps: [
          step({ id: 's1', kind: 'asset', ref: 'a1', status: 'completed', resultUrl: 'https://r2/1.mp3' }),
          step({ id: 's2', kind: 'asset', ref: 'a2', status: 'skipped' }),
          step({ id: 's3', kind: 'asset', ref: 'a3', status: 'completed', resultUrl: 'https://r2/1.png' }),
        ],
      }),
    )

    assert.deepEqual(ready.musicLoops, [{ url: 'https://r2/1.mp3', lengthSec: 90, orderIndex: 0 }])
    assert.deepEqual(ready.visualAssets, [
      { url: 'https://r2/1.png', durationSec: 12, orderIndex: 2 },
    ])
    assert.equal(ready.plannedMusic, 2)
    assert.equal(ready.plannedVisual, 1)
  })

  it('takes a stock track from its row, because it was never a Step', () => {
    const ready = readyLofiAssets(
      [
        assetRow({
          id: 'a1',
          kind: 'stock-music',
          status: 'ready',
          resultUrl: 'https://r2/dust.mp3',
          durationSec: 123,
        }),
      ],
      run({ steps: [] }),
    )

    assert.deepEqual(ready.musicLoops, [
      { url: 'https://r2/dust.mp3', lengthSec: 123, orderIndex: 0 },
    ])
  })
})

describe('requiredMusicLoops', () => {
  it('asks for a share of what was planned', () => {
    assert.equal(requiredMusicLoops(20, 0.8), 16)
  })

  it('never asks for more loops than the video planned', () => {
    assert.equal(requiredMusicLoops(4, 0.8), 4)
    assert.equal(requiredMusicLoops(1, 0.8), 1)
  })

  it('asks for nothing when no loops were planned', () => {
    assert.equal(requiredMusicLoops(0, 0.8), 0)
  })
})

describe('assertLofiRenderable', () => {
  const ready = (over: Partial<ReturnType<typeof readyLofiAssets>> = {}) => ({
    musicLoops: [],
    visualAssets: [],
    plannedMusic: 0,
    plannedVisual: 0,
    ...over,
  })

  const loops = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      url: `https://r2/${i}.mp3`,
      lengthSec: 90,
      orderIndex: i,
    }))

  it('says so when no music came back at all', () => {
    assert.throws(
      () => assertLofiRenderable(ready({ plannedMusic: 4 }), 0.8),
      /No music was generated/,
    )
  })

  it('names the shortfall when too few loops came back', () => {
    assert.throws(
      () => assertLofiRenderable(ready({ musicLoops: loops(2), plannedMusic: 20 }), 0.8),
      /Only 2 of 20 music tracks were generated — 16 are needed/,
    )
  })

  it('refuses to render a shorter video than the one that was asked for', () => {
    assert.throws(
      () =>
        assertLofiRenderable(
          ready({ musicLoops: loops(4), plannedMusic: 4, plannedVisual: 3 }),
          0.8,
        ),
      /Only 0 of 3 visuals/,
    )
  })

  it('passes once enough loops are in', () => {
    assert.doesNotThrow(() =>
      assertLofiRenderable(ready({ musicLoops: loops(16), plannedMusic: 20 }), 0.8),
    )
  })
})

describe('effectiveVisualMode', () => {
  const visual = (url: string) => ({ url, durationSec: 10, orderIndex: 0 })

  it('reads stills from the files rather than trusting the stored mode', () => {
    assert.equal(effectiveVisualMode([visual('https://r2/a.png')]), 'single-image')
    assert.equal(
      effectiveVisualMode([visual('https://r2/a.jpg'), visual('https://r2/b.jpg')]),
      'multi-image',
    )
  })

  it('reads clips the same way', () => {
    assert.equal(effectiveVisualMode([visual('https://r2/a.mp4')]), 'single-video')
    assert.equal(
      effectiveVisualMode([visual('https://r2/a.mp4'), visual('https://r2/b.mp4')]),
      'multi-video',
    )
  })

  it('ignores a query string on the URL', () => {
    assert.equal(effectiveVisualMode([visual('https://r2/a.webp?v=2')]), 'single-image')
  })
})

describe('lofiStatusForRun', () => {
  const assets = [step({ id: 's1', kind: 'asset', stage: 0 })]
  const render = step({ id: 's2', kind: 'render', stage: 1 })

  it('reads generating while the assets are still out at fal', () => {
    const r = run({ steps: [{ ...assets[0], status: 'running' }, render] })
    assert.equal(lofiStatusForRun(r), 'generating')
    assert.equal(lofiPhaseForRun(r), 'generating_assets')
  })

  it('reads rendering once the assets have fanned in', () => {
    const r = run({
      steps: [
        { ...assets[0], status: 'completed', resultUrl: 'https://r2/1.mp3' },
        { ...render, status: 'running' },
      ],
    })
    assert.equal(lofiStatusForRun(r), 'rendering')
    assert.equal(lofiPhaseForRun(r), 'rendering')
  })

  it('has no phase once the Run is terminal, so nothing can render as loading', () => {
    assert.equal(lofiPhaseForRun(run({ status: 'completed' })), null)
    assert.equal(lofiPhaseForRun(run({ status: 'failed' })), null)
    assert.equal(lofiPhaseForRun(run({ status: 'aborted' })), null)
  })

  it('mirrors terminal Runs onto the video row', () => {
    assert.equal(lofiStatusForRun(run({ status: 'completed' })), 'complete')
    assert.equal(lofiStatusForRun(run({ status: 'failed' })), 'failed')
    assert.equal(lofiStatusForRun(run({ status: 'aborted' })), 'aborted')
  })

  it('does not read rendering just because one loop was written off', () => {
    const r = run({
      steps: [
        step({ id: 's0', kind: 'asset', stage: 0, status: 'skipped' }),
        step({ id: 's1', kind: 'asset', stage: 0, status: 'running' }),
        render,
      ],
    })
    assert.equal(lofiPhaseForRun(r), 'generating_assets')
  })
})

describe('lofiRetryOffer', () => {
  it('offers retry on a failed Run', () => {
    assert.deepEqual(lofiRetryOffer(run({ status: 'failed' })), { retryable: true })
  })

  it('explains that a cancelled generation is not retried but recomposed', () => {
    const offer = lofiRetryOffer(run({ status: 'aborted' }))
    assert.equal(offer.retryable, false)
    assert.match(offer.reason ?? '', /cancelled/)
  })

  it('explains a failure the kernel has marked unretryable', () => {
    const offer = lofiRetryOffer(
      run({ status: 'failed', retryable: false, error: 'This video has no assets to generate' }),
    )
    assert.equal(offer.retryable, false)
    assert.equal(offer.reason, 'This video has no assets to generate')
  })
})

describe('toLofiRunHydration', () => {
  it('hydrates an in-flight Run with the phase and how far the assets got', () => {
    const hydration = toLofiRunHydration(
      run({
        steps: [
          step({ id: 's1', kind: 'asset', status: 'completed', resultUrl: 'https://r2/1.mp3' }),
          step({ id: 's2', kind: 'asset', status: 'running' }),
          step({ id: 's3', kind: 'render', stage: 1 }),
        ],
      }),
    )

    assert.deepEqual(hydration, {
      runId: 'run-1',
      status: 'running',
      phase: 'generating_assets',
      error: undefined,
      retryable: false,
    })
  })

  it('hydrates nothing for a completed Run: the page reads the video URL', () => {
    assert.equal(toLofiRunHydration(run({ status: 'completed' })), null)
  })

  it('hydrates a failed Run with its error and a retry offer', () => {
    const hydration = toLofiRunHydration(run({ status: 'failed', error: 'compose blew up' }))
    assert.equal(hydration?.status, 'failed')
    assert.equal(hydration?.phase, null)
    assert.equal(hydration?.error, 'compose blew up')
    assert.equal(hydration?.retryable, true)
  })
})

describe('orphanedLofiStatus', () => {
  it('settles a generating video that has no Run, rather than spinning forever', () => {
    assert.equal(orphanedLofiStatus({ status: 'generating', finalVideoUrl: null }, null), 'failed')
  })

  it('settles the old gating status too', () => {
    assert.equal(orphanedLofiStatus({ status: 'gating', finalVideoUrl: null }, null), 'failed')
  })

  it('settles it as complete when the video is in fact already there', () => {
    assert.equal(
      orphanedLofiStatus({ status: 'rendering', finalVideoUrl: 'https://r2/final.mp4' }, null),
      'complete',
    )
  })

  it('leaves a video with a live Run alone', () => {
    assert.equal(orphanedLofiStatus({ status: 'generating', finalVideoUrl: null }, run()), null)
  })

  it('leaves a video that never claimed to be working alone', () => {
    assert.equal(orphanedLofiStatus({ status: 'complete', finalVideoUrl: null }, null), null)
  })
})

describe('the lofi Run end to end', () => {
  function setup(assets: LofiAssetRow[]) {
    const fal = new FakeFalQueue()
    const store = new FakeRunStore()
    const credits = new FakeCredits(1000)
    const media = new FakeMediaStore()
    const sink = new FakeResultSink()
    const renderInputs: Run[] = []

    let ids = 0
    let clock = 1_700_000_000_000

    const kernel = createVideoKernel({
      fal,
      store,
      credits,
      media,
      sink,
      planner: createLofiPlanner({
        loadAssets: async () => assets,
        buildRenderInput: async (_target, r) => {
          renderInputs.push(r)
          const ready = readyLofiAssets(assets, r)
          assertLofiRenderable(ready, 0.8)
          return { tracks: [] }
        },
      }),
      webhooks: fakeWebhookUrls,
      newId: () => `id-${++ids}`,
      now: () => ++clock,
    })

    return { kernel, fal, credits, sink, renderInputs }
  }

  /** A full-length video: twelve loops, so losing one is still renderable. */
  const loopsAndAVisual = (loops = 12) => [
    ...Array.from({ length: loops }, (_, i) =>
      assetRow({ id: `a${i + 1}`, kind: 'music', orderIndex: i }),
    ),
    assetRow({
      id: 'visual',
      kind: 'visual',
      orderIndex: loops,
      model: 'flux-schnell-fal',
      durationSec: 12,
    }),
  ]

  /** fal answering every outstanding request with a usable asset. */
  function completeAssets(fal: FakeFalQueue, loops: number, options: { skipFirst?: boolean } = {}) {
    for (let i = 1; i <= loops; i++) {
      if (i === 1 && options.skipFirst) {
        fal.completeWithError(fal.requestIdAt(i), 'model refused the prompt')
        continue
      }
      fal.complete(fal.requestIdAt(i), { audio: { url: `https://fal.test/${i}.mp3` } })
    }
    fal.complete(fal.requestIdAt(loops + 1), { images: [{ url: 'https://fal.test/1.png' }] })
  }

  it('unsticks generating when the asset webhooks never arrived', async () => {
    const { kernel, fal, sink } = setup(loopsAndAVisual())

    await kernel.start(target)
    assert.equal(fal.submits.length, 13)

    // fal finished every one of them; not a single webhook landed.
    completeAssets(fal, 12)

    const rendering = await kernel.get(target)
    assert.equal(rendering?.status, 'running')
    assert.equal(fal.submits.length, 14)
    assert.equal(fal.submits[13].endpoint, LOFI_RENDER_MODEL_ID)

    fal.completeWithVideo(fal.requestIdAt(14), 'https://fal.test/final.mp4')
    const done = await kernel.get(target)

    assert.equal(done?.status, 'completed')
    assert.equal(sink.videoUrlFor(target), 'rehosted:https://fal.test/final.mp4')
  })

  it('renders on the loops it has when one loop fal would not make', async () => {
    const { kernel, fal, renderInputs } = setup(loopsAndAVisual())

    await kernel.start(target)
    completeAssets(fal, 12, { skipFirst: true })

    const run = await kernel.get(target)

    assert.equal(run?.status, 'running')
    assert.equal(run?.steps[0].status, 'skipped')
    assert.equal(run?.steps[0].error, 'model refused the prompt')
    assert.equal(fal.submits.length, 14)
    assert.equal(readyLofiAssets(loopsAndAVisual(), renderInputs[0]).musicLoops.length, 11)
  })

  it('fails with a reason the user can read when too few loops came back', async () => {
    const { kernel, fal } = setup(loopsAndAVisual())

    await kernel.start(target)
    for (let i = 1; i <= 12; i++) {
      if (i <= 3) fal.complete(fal.requestIdAt(i), { audio: { url: `https://fal.test/${i}.mp3` } })
      else fal.completeWithError(fal.requestIdAt(i), 'model refused the prompt')
    }
    fal.complete(fal.requestIdAt(13), { images: [{ url: 'https://fal.test/1.png' }] })

    const run = await kernel.get(target)

    assert.equal(run?.status, 'failed')
    assert.match(run?.error ?? '', /Only 3 of 12 music tracks were generated — 10 are needed/)
    assert.equal(lofiRetryOffer(run as Run).retryable, true)
  })

  it('fails with a reason the user can read when the visual did not come back', async () => {
    const { kernel, fal } = setup(loopsAndAVisual())

    await kernel.start(target)
    for (let i = 1; i <= 12; i++) {
      fal.complete(fal.requestIdAt(i), { audio: { url: `https://fal.test/${i}.mp3` } })
    }
    fal.completeWithError(fal.requestIdAt(13), 'the image model fell over')

    const run = await kernel.get(target)

    assert.equal(run?.status, 'failed')
    assert.equal(run?.error, 'the image model fell over')
    assert.equal(lofiRetryOffer(run as Run).retryable, true)
  })

  it('renders from ready assets on retry, charging only for the loop that ran again', async () => {
    const { kernel, fal, credits } = setup(loopsAndAVisual())

    const started = await kernel.start(target)
    completeAssets(fal, 12, { skipFirst: true })
    await kernel.get(target)
    fal.completeWithError(fal.requestIdAt(14), 'compose blew up')
    const failed = await kernel.get(target)
    assert.equal(failed?.status, 'failed')
    assert.equal(failed?.error, 'compose blew up')

    const reserved = credits.totalOf('reserve')
    const retried = await kernel.retry(started.id)

    assert.equal(retried.status, 'running')
    // The eleven loops that produced music, and the visual, are left as they are.
    assert.equal(retried.steps[0].status, 'running')
    assert.equal(retried.steps[1].status, 'completed')
    assert.equal(retried.steps[12].status, 'completed')
    // One loop plus the render, not a whole new video.
    assert.ok(credits.totalOf('reserve') - reserved < reserved / 2)
  })

  it('joins the Run already in flight rather than composing twice', async () => {
    const { kernel, fal } = setup(loopsAndAVisual())

    const first = await kernel.start(target)
    const second = await kernel.start(target)

    assert.equal(second.id, first.id)
    assert.equal(fal.submits.length, 13)
  })

  it('ignores a late fal success after cancel and hands the credits back', async () => {
    const { kernel, fal, sink, credits } = setup(loopsAndAVisual())

    const started = await kernel.start(target)
    const cancelled = await kernel.cancel(started.id)
    assert.equal(cancelled.status, 'aborted')
    assert.equal(fal.cancels.length, 13)
    assert.equal(credits.totalOf('release'), credits.totalOf('reserve'))

    fal.complete(fal.requestIdAt(1), { audio: { url: 'https://fal.test/1.mp3' } })
    const run = await kernel.get(target)

    assert.equal(run?.status, 'aborted')
    assert.equal(sink.applied.length, 0)
    assert.equal(lofiRetryOffer(run as Run).retryable, false)
  })

  it('composes stock tracks without ever enqueueing them', async () => {
    const assets = [
      assetRow({
        id: 'a1',
        kind: 'stock-music',
        orderIndex: 0,
        status: 'ready',
        resultUrl: 'https://r2/dust.mp3',
        durationSec: 123,
      }),
      assetRow({ id: 'a2', kind: 'visual', orderIndex: 1, model: 'flux-schnell-fal', durationSec: 12 }),
    ]
    const { kernel, fal, sink } = setup(assets)

    await kernel.start(target)
    assert.equal(fal.submits.length, 1)

    fal.complete(fal.requestIdAt(1), { images: [{ url: 'https://fal.test/1.png' }] })
    await kernel.get(target)
    assert.equal(fal.submits.length, 2)

    fal.completeWithVideo(fal.requestIdAt(2), 'https://fal.test/final.mp4')
    assert.equal((await kernel.get(target))?.status, 'completed')
    assert.equal(sink.videoUrlFor(target), 'rehosted:https://fal.test/final.mp4')
  })

  it('fails the Run rather than leaving it running when fal will not take the render', async () => {
    const { kernel, fal } = setup(loopsAndAVisual())

    await kernel.start(target)
    completeAssets(fal, 12)
    fal.failNextSubmit('fal is down')

    const run = await kernel.get(target)

    assert.equal(run?.status, 'failed')
    assert.equal(run?.error, 'fal is down')
    assert.equal(run?.retryable, true)
  })
})
