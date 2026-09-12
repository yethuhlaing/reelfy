/**
 * Kernel tests. External behaviour at the kernel interface only — no Next
 * routes, no EventSource, no Redis. "Refresh lost the Run" is expressed here as
 * `start` -> drop every client -> `get(Target)`.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { RunNotRetryableError } from './errors'
import {
  FakeCredits,
  FakeFalQueue,
  FakeMediaStore,
  FakeResultSink,
  FakeRunStore,
  fakePlanner,
  fakeWebhookUrls,
  step,
  stepFromPrevious,
} from './fakes'
import { createVideoKernel } from './kernel'
import type { StepPlan, TargetRef } from './types'

const scene: TargetRef = { kind: 'scene', userId: 'u1', storyId: 's1', sceneId: 'sc1' }
const story: TargetRef = { kind: 'story', userId: 'u1', storyId: 's1' }
const project: TargetRef = { kind: 'brainrotProject', userId: 'u1', projectId: 'p1' }
const lofiVideo: TargetRef = { kind: 'lofiVideo', userId: 'u1', videoId: 'v1' }

function setup(steps: StepPlan[], options: { balance?: number } = {}) {
  const fal = new FakeFalQueue()
  const store = new FakeRunStore()
  const credits = new FakeCredits(options.balance ?? 1000)
  const media = new FakeMediaStore()
  const sink = new FakeResultSink()

  let ids = 0
  let clock = 1_700_000_000_000

  const kernel = createVideoKernel({
    fal,
    store,
    credits,
    media,
    sink,
    planner: fakePlanner(() => ({ steps })),
    webhooks: fakeWebhookUrls,
    newId: () => `id-${++ids}`,
    now: () => ++clock,
  })

  return { kernel, fal, store, credits, media, sink }
}

function present<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what} to be present`)
  return value
}

describe('start', () => {
  it('enqueues one fal request and leaves the Run running', async () => {
    const { kernel, fal } = setup([step('animate')])

    const run = await kernel.start(scene)

    assert.equal(run.status, 'running')
    assert.equal(fal.submits.length, 1)
    assert.equal(run.steps[0].status, 'running')
    assert.equal(run.steps[0].providerEndpoint, 'fal-ai/test/animate')
    assert.equal(run.steps[0].providerRequestId, 'fal-req-1')
  })

  it('passes a per-Step webhook URL to fal', async () => {
    const { kernel, fal } = setup([step('animate')])

    const run = await kernel.start(scene)

    assert.equal(
      fal.submits[0].webhookUrl,
      `https://webhook.test/api/webhooks/fal/video/run/${run.id}/${run.steps[0].id}`,
    )
  })

  it('returns the in-flight Run without submitting or reserving again', async () => {
    const { kernel, fal, credits } = setup([step('animate', { credits: 5 })])

    const first = await kernel.start(scene)
    const second = await kernel.start(scene)

    assert.equal(second.id, first.id)
    assert.equal(fal.submits.length, 1)
    assert.equal(credits.countOf('reserve'), 1)
    assert.equal(credits.totalOf('reserve'), 5)
  })

  it('allows a new Run on the same Target once the previous one is terminal', async () => {
    const { kernel, fal, store } = setup([step('animate')])

    const first = await kernel.start(scene)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/one.mp4')
    const completed = present(await kernel.get(scene))
    assert.equal(completed.status, 'completed')

    const second = await kernel.start(scene)

    assert.notEqual(second.id, first.id)
    assert.equal(second.status, 'running')
    assert.equal(store.countForTarget(scene), 2)
  })

  it('fails the Run when the enqueue itself throws, rather than leaving it running without provider ids', async () => {
    const { kernel, fal, credits } = setup([step('animate', { credits: 3 })])
    fal.failNextSubmit('fal is down')

    const run = await kernel.start(scene)

    assert.equal(run.status, 'failed')
    assert.equal(run.retryable, true)
    assert.equal(run.error, 'fal is down')
    assert.equal(run.steps[0].providerRequestId, undefined)
    assert.equal(credits.totalOf('release'), 3)
  })

  it('does not leave a Run in flight when credits cannot be reserved', async () => {
    const { kernel, fal } = setup([step('animate', { credits: 50 })], { balance: 10 })

    await assert.rejects(() => kernel.start(scene), /Insufficient credits/)

    const run = present(await kernel.get(scene))
    assert.equal(run.status, 'failed')
    assert.equal(fal.submits.length, 0)
  })
})

describe('get', () => {
  it('still has the Run after every client is gone', async () => {
    const { kernel } = setup([step('animate')])

    const started = await kernel.start(scene)
    // Drop every client: nothing survives but the store.
    const reattached = present(await kernel.get(scene))

    assert.equal(reattached.id, started.id)
    assert.equal(reattached.status, 'running')
  })

  it('applies the result when fal COMPLETED and the webhook never arrived', async () => {
    const { kernel, fal, sink } = setup([step('animate')])

    await kernel.start(scene)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/a.mp4')

    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'completed')
    assert.equal(sink.videoUrlFor(scene), 'rehosted:https://fal.test/a.mp4')
  })

  it('fails the Step when fal COMPLETED carries an error', async () => {
    const { kernel, fal, sink } = setup([step('compose')])

    await kernel.start(story)
    fal.completeWithError(fal.lastRequestId(), 'ffmpeg exploded')

    const run = present(await kernel.get(story))

    assert.equal(run.status, 'failed')
    assert.equal(run.error, 'ffmpeg exploded')
    assert.equal(run.retryable, true)
    assert.equal(sink.applied.length, 0)
  })

  it('leaves an IN_QUEUE Run running', async () => {
    const { kernel, sink } = setup([step('animate')])

    await kernel.start(scene)
    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'running')
    assert.equal(sink.applied.length, 0)
  })

  it('leaves an IN_PROGRESS Run running', async () => {
    const { kernel, fal, sink } = setup([step('animate')])

    await kernel.start(scene)
    fal.inProgress(fal.lastRequestId())
    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'running')
    assert.equal(sink.applied.length, 0)
  })

  it('fails the Run as retryable when fal has forgotten the request', async () => {
    const { kernel, fal } = setup([step('animate')])

    await kernel.start(scene)
    fal.forget(fal.lastRequestId())

    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'failed')
    assert.equal(run.retryable, true)
    assert.ok(run.error?.includes('result window'))
  })

  it('fails the Run as retryable when the queue result is gone after completion', async () => {
    const { kernel, fal } = setup([step('animate')])

    await kernel.start(scene)
    fal.completeButLoseResult(fal.lastRequestId())

    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'failed')
    assert.equal(run.retryable, true)
  })

  it('is a no-op on a terminal Run and does not ask fal again', async () => {
    const { kernel, fal } = setup([step('animate')])

    await kernel.start(scene)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/a.mp4')
    await kernel.get(scene)

    const checksAfterCompletion = fal.statusChecks.length
    const run = present(await kernel.get(scene))

    assert.equal(run.status, 'completed')
    assert.equal(fal.statusChecks.length, checksAfterCompletion)
  })

  it('returns null for a Target that never had a Run', async () => {
    const { kernel } = setup([step('animate')])

    assert.equal(await kernel.get(scene), null)
  })
})

describe('onWebhook', () => {
  it('completes the Run from the webhook payload', async () => {
    const { kernel, sink } = setup([step('compose')])

    const started = await kernel.start(story)
    const run = await kernel.onWebhook({
      runId: started.id,
      stepId: started.steps[0].id,
      body: { status: 'OK', payload: { video_url: 'https://fal.test/x.mp4' } },
    })

    assert.equal(run.status, 'completed')
    assert.equal(sink.videoUrlFor(story), 'rehosted:https://fal.test/x.mp4')
  })

  it('is a no-op when the same delivery arrives twice', async () => {
    const { kernel, sink, media } = setup([step('compose')])

    const started = await kernel.start(story)
    const body = { status: 'OK', payload: { video_url: 'https://fal.test/x.mp4' } }

    const first = await kernel.onWebhook({ runId: started.id, stepId: started.steps[0].id, body })
    const second = await kernel.onWebhook({ runId: started.id, stepId: started.steps[0].id, body })

    assert.equal(first.status, 'completed')
    assert.equal(second.status, 'completed')
    assert.equal(sink.applied.length, 1)
    assert.equal(media.rehosted.length, 1)
  })

  it('maps an ERROR body to a Step failure', async () => {
    const { kernel } = setup([step('compose')])

    const started = await kernel.start(story)
    const run = await kernel.onWebhook({
      runId: started.id,
      stepId: started.steps[0].id,
      body: { status: 'ERROR', error: 'compose blew up' },
    })

    assert.equal(run.status, 'failed')
    assert.equal(run.error, 'compose blew up')
  })

  it('falls back to asking fal when the body carries no media URL', async () => {
    const { kernel, fal, sink } = setup([step('compose')])

    const started = await kernel.start(story)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/from-queue.mp4')

    const run = await kernel.onWebhook({
      runId: started.id,
      stepId: started.steps[0].id,
      body: { status: 'OK' },
    })

    assert.equal(run.status, 'completed')
    assert.equal(sink.videoUrlFor(story), 'rehosted:https://fal.test/from-queue.mp4')
  })
})

describe('cancel', () => {
  it('aborts the Run, asks fal to cancel, and releases unused credits', async () => {
    const { kernel, fal, credits } = setup([step('animate', { credits: 7 })])

    const started = await kernel.start(scene)
    const run = await kernel.cancel(started.id)

    assert.equal(run.status, 'aborted')
    assert.equal(run.steps[0].status, 'aborted')
    assert.deepEqual(fal.cancels, [{ endpoint: 'fal-ai/test/animate', requestId: 'fal-req-1' }])
    assert.equal(credits.totalOf('release'), 7)
    assert.equal(credits.balance, 1000)
  })

  it('ignores a late fal success', async () => {
    const { kernel, fal, sink } = setup([step('animate')])

    const started = await kernel.start(scene)
    await kernel.cancel(started.id)

    const afterWebhook = await kernel.onWebhook({
      runId: started.id,
      stepId: started.steps[0].id,
      body: { status: 'OK', payload: { video_url: 'https://fal.test/late.mp4' } },
    })
    assert.equal(afterWebhook.status, 'aborted')

    // A reconcile-on-read must not resurrect it either.
    fal.completeWithVideo('fal-req-1', 'https://fal.test/late.mp4')
    const afterGet = present(await kernel.get(scene))

    assert.equal(afterGet.status, 'aborted')
    assert.equal(sink.applied.length, 0)
  })

  it('is a no-op on an already terminal Run', async () => {
    const { kernel, fal } = setup([step('animate')])

    const started = await kernel.start(scene)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/a.mp4')
    await kernel.get(scene)

    const run = await kernel.cancel(started.id)

    assert.equal(run.status, 'completed')
    assert.equal(fal.cancels.length, 0)
  })

  it('survives fal refusing to cancel', async () => {
    const { kernel } = setup([step('animate')])
    const started = await kernel.start(scene)

    const rejecting = createVideoKernel({
      fal: {
        submit: async () => ({ requestId: 'x' }),
        status: async () => ({ status: 'IN_QUEUE' }),
        result: async () => ({ found: false }),
        cancel: async () => {
          throw new Error('marketplace model ignores cancel')
        },
      },
      store: {
        create: async (run) => run,
        findCurrentByTarget: async () => started,
        findById: async () => started,
        save: async (run) => run,
      },
      credits: new FakeCredits(),
      media: new FakeMediaStore(),
      sink: new FakeResultSink(),
      planner: fakePlanner(() => ({ steps: [step('animate')] })),
    })

    const run = await rejecting.cancel(started.id)

    assert.equal(run.status, 'aborted')
  })
})

describe('retry', () => {
  it('is only legal from failed', async () => {
    const { kernel } = setup([step('animate')])

    const started = await kernel.start(scene)
    await kernel.cancel(started.id)

    await assert.rejects(() => kernel.retry(started.id), RunNotRetryableError)
  })

  it('replays the failed Step on the same Run and Target', async () => {
    const { kernel, fal } = setup([step('animate')])

    const started = await kernel.start(scene)
    fal.completeWithError(fal.lastRequestId(), 'nope')
    await kernel.get(scene)

    const retried = await kernel.retry(started.id)

    assert.equal(retried.id, started.id)
    assert.equal(retried.status, 'running')
    assert.equal(fal.submits.length, 2)
    assert.equal(retried.steps[0].providerRequestId, 'fal-req-2')
  })
})

describe('brainrot: compose then subtitle as two Steps of one Run', () => {
  const plan = () => [
    step('compose', { stage: 0, credits: 6 }),
    stepFromPrevious('subtitle', { stage: 1, credits: 4 }),
  ]

  it('does not apply the composed video before subtitling has run', async () => {
    const { kernel, fal, sink } = setup(plan())

    await kernel.start(project)
    assert.equal(fal.submits.length, 1)

    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/composed.mp4')
    const run = present(await kernel.get(project))

    assert.equal(run.status, 'running')
    assert.equal(fal.submits.length, 2)
    assert.equal(fal.submits[1].input.videoUrl, 'rehosted:https://fal.test/composed.mp4')
    // No finished reel missing captions, and no spinner stuck between Steps.
    assert.equal(sink.applied.length, 0)
  })

  it('retries subtitle only when compose already produced a video', async () => {
    const { kernel, fal, credits, sink } = setup(plan())

    const started = await kernel.start(project)
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/composed.mp4')
    await kernel.get(project)
    fal.completeWithError(fal.requestIdAt(2), 'subtitle broke')
    const failed = present(await kernel.get(project))
    assert.equal(failed.status, 'failed')

    const reservedBefore = credits.totalOf('reserve')
    const retried = await kernel.retry(started.id)

    assert.equal(retried.status, 'running')
    assert.equal(fal.submits.length, 3)
    assert.equal(fal.submits[2].input.kind, 'subtitle')
    // Only the subtitle Step is paid for again.
    assert.equal(credits.totalOf('reserve') - reservedBefore, 4)

    fal.completeWithVideo(fal.requestIdAt(3), 'https://fal.test/captioned.mp4')
    const done = present(await kernel.get(project))

    assert.equal(done.status, 'completed')
    assert.equal(sink.videoUrlFor(project), 'rehosted:https://fal.test/captioned.mp4')
  })

  it('reconciles a missed webhook on either Step', async () => {
    const { kernel, fal, sink } = setup(plan())

    await kernel.start(project)
    // Compose webhook never arrives; fal is already done.
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/composed.mp4')
    await kernel.get(project)
    // Subtitle webhook never arrives either.
    fal.completeWithVideo(fal.requestIdAt(2), 'https://fal.test/captioned.mp4')
    const run = present(await kernel.get(project))

    assert.equal(run.status, 'completed')
    assert.equal(sink.videoUrlFor(project), 'rehosted:https://fal.test/captioned.mp4')
  })
})

describe('lofi: asset Steps then render', () => {
  const plan = () => [
    step('asset', { stage: 0, credits: 2 }),
    step('asset', { stage: 0, credits: 2 }),
    step('render', { stage: 1, credits: 5 }),
  ]

  it('submits both assets together and fans in before rendering', async () => {
    const { kernel, fal } = setup(plan())

    const started = await kernel.start(lofiVideo)
    assert.equal(fal.submits.length, 2)
    assert.equal(present(await kernel.progress(started.id)).phase, 'generating_assets')

    // One asset completes: the Run keeps waiting, it does not advance or stick.
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/music.mp3')
    const midway = present(await kernel.get(lofiVideo))
    assert.equal(midway.status, 'running')
    assert.equal(fal.submits.length, 2)
    assert.equal(present(await kernel.progress(started.id)).phase, 'generating_assets')

    // Second asset completes: fan-in, render goes out.
    fal.completeWithVideo(fal.requestIdAt(2), 'https://fal.test/visual.mp4')
    const rendering = present(await kernel.get(lofiVideo))
    assert.equal(rendering.status, 'running')
    assert.equal(fal.submits.length, 3)
    assert.equal(present(await kernel.progress(started.id)).phase, 'rendering')
  })

  it('unsticks generating when an asset webhook was missed', async () => {
    const { kernel, fal, sink } = setup(plan())

    await kernel.start(lofiVideo)
    // Both assets finished on fal; neither webhook arrived.
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/music.mp3')
    fal.completeWithVideo(fal.requestIdAt(2), 'https://fal.test/visual.mp4')

    const run = present(await kernel.get(lofiVideo))
    assert.equal(run.status, 'running')
    assert.equal(fal.submits.length, 3)

    fal.completeWithVideo(fal.requestIdAt(3), 'https://fal.test/final.mp4')
    const done = present(await kernel.get(lofiVideo))

    assert.equal(done.status, 'completed')
    assert.equal(sink.videoUrlFor(lofiVideo), 'rehosted:https://fal.test/final.mp4')
  })

  it('ignores a late compose after cancel', async () => {
    const { kernel, fal, sink } = setup(plan())

    const started = await kernel.start(lofiVideo)
    await kernel.cancel(started.id)

    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/music.mp3')
    const run = present(await kernel.get(lofiVideo))

    assert.equal(run.status, 'aborted')
    assert.equal(sink.applied.length, 0)
  })
})

describe('progress', () => {
  it('reports the phase of the current Step while in flight', async () => {
    const { kernel } = setup([step('animate')])

    const started = await kernel.start(scene)
    const progress = present(await kernel.progress(started.id))

    assert.equal(progress.status, 'running')
    assert.equal(progress.phase, 'animating')
  })

  it('has no phase once the Run is terminal', async () => {
    const { kernel, fal } = setup([step('compose')])

    const started = await kernel.start(story)
    fal.completeWithVideo(fal.lastRequestId(), 'https://fal.test/x.mp4')
    await kernel.get(story)

    const progress = present(await kernel.progress(started.id))

    assert.equal(progress.status, 'completed')
    assert.equal(progress.phase, null)
    assert.equal(progress.videoUrl, 'rehosted:https://fal.test/x.mp4')
  })

  it('surfaces the error and retryability of a failed Run', async () => {
    const { kernel, fal } = setup([step('compose')])

    const started = await kernel.start(story)
    fal.completeWithError(fal.lastRequestId(), 'compose blew up')
    await kernel.get(story)

    const progress = present(await kernel.progress(started.id))

    assert.equal(progress.status, 'failed')
    assert.equal(progress.phase, null)
    assert.equal(progress.error, 'compose blew up')
    assert.equal(progress.retryable, true)
  })

  it('returns null for an unknown Run', async () => {
    const { kernel } = setup([step('animate')])

    assert.equal(await kernel.progress('nope'), null)
  })
})

describe('credits', () => {
  it('consumes as Steps succeed and returns the rest on completion', async () => {
    const { kernel, fal, credits } = setup([
      step('compose', { stage: 0, credits: 6 }),
      stepFromPrevious('subtitle', { stage: 1, credits: 4 }),
    ])

    await kernel.start(project)
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/composed.mp4')
    await kernel.get(project)
    fal.completeWithVideo(fal.requestIdAt(2), 'https://fal.test/captioned.mp4')
    await kernel.get(project)

    assert.equal(credits.totalOf('reserve'), 10)
    assert.equal(credits.totalOf('consume'), 10)
    assert.equal(credits.balance, 990)
  })

  it('releases the unconsumed reservation when a Run fails', async () => {
    const { kernel, fal, credits } = setup([
      step('compose', { stage: 0, credits: 6 }),
      stepFromPrevious('subtitle', { stage: 1, credits: 4 }),
    ])

    await kernel.start(project)
    fal.completeWithVideo(fal.requestIdAt(1), 'https://fal.test/composed.mp4')
    await kernel.get(project)
    fal.completeWithError(fal.requestIdAt(2), 'subtitle broke')
    await kernel.get(project)

    assert.equal(credits.totalOf('consume'), 6)
    assert.equal(credits.totalOf('release'), 4)
    assert.equal(credits.balance, 994)
  })

  it('does not charge twice when a webhook is delivered twice', async () => {
    const { kernel, credits } = setup([step('compose', { credits: 6 })])

    const started = await kernel.start(story)
    const body = { status: 'OK', payload: { video_url: 'https://fal.test/x.mp4' } }
    await kernel.onWebhook({ runId: started.id, stepId: started.steps[0].id, body })
    await kernel.onWebhook({ runId: started.id, stepId: started.steps[0].id, body })

    assert.equal(credits.totalOf('consume'), 6)
    assert.equal(credits.balance, 994)
  })
})
