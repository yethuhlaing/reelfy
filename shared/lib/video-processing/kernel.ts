/**
 * The Video processing kernel.
 *
 * One implementation of a Run's lifecycle, shared by story animate, story
 * export, brainrot export and lofi generate. HTTP routes, webhook handlers and
 * product pages are thin adapters over these six operations.
 *
 * The load-bearing idea is that the webhook is the fast path, not the only
 * path: `get` reconciles an in-flight Run against fal's queue, so a delivery
 * that never arrives still becomes a video (or a real failure) on the next read.
 */

import { RunNotFoundError, RunNotRetryableError } from './errors'
import type {
  Credits,
  FalQueue,
  FalWebhookBody,
  MediaStore,
  Run,
  RunPlan,
  RunPlanner,
  RunProgress,
  ResultSink,
  RunStore,
  Step,
  TargetRef,
  WebhookUrls,
} from './types'
import { isInFlight, isTerminal, phaseForKind } from './types'

export interface KernelDeps {
  fal: FalQueue
  store: RunStore
  credits: Credits
  media: MediaStore
  sink: ResultSink
  planner: RunPlanner
  webhooks?: WebhookUrls
  now?: () => number
  newId?: () => string
}

export interface VideoKernel {
  /**
   * Idempotent. A Target with an in-flight Run gets that Run back — no second
   * fal submit, no second reserve. A terminal Run means a new user action may
   * start a fresh Run on the same Target.
   */
  start(target: TargetRef): Promise<Run>
  /** The current Run on this Target, reconciled against fal if it is in flight. */
  get(target: TargetRef): Promise<Run | null>
  cancel(runId: string): Promise<Run>
  /** Only from `failed`. Replays every Step that did not complete. */
  retry(runId: string): Promise<Run>
  onWebhook(params: { runId: string; stepId: string; body: FalWebhookBody }): Promise<Run>
  progress(runId: string): Promise<RunProgress | null>
}

export function createVideoKernel(deps: KernelDeps): VideoKernel {
  const now = deps.now ?? (() => Date.now())
  const newId = deps.newId ?? (() => crypto.randomUUID())

  // --- Run shape helpers ----------------------------------------------------

  /** Lowest stage that still has work, or `null` when every Step has completed. */
  function currentStage(run: Run): number | null {
    let lowest: number | null = null
    for (const step of run.steps) {
      if (step.status === 'completed') continue
      if (lowest === null || step.stage < lowest) lowest = step.stage
    }
    return lowest
  }

  function stepsInStage(run: Run, stage: number): Step[] {
    return run.steps.filter((step) => step.stage === stage)
  }

  function completedResultUrls(run: Run): string[] {
    return run.steps
      .filter((step) => step.status === 'completed' && step.resultUrl)
      .map((step) => step.resultUrl as string)
  }

  function finalResultUrl(run: Run): string | undefined {
    const urls = completedResultUrls(run)
    return urls.length > 0 ? urls[urls.length - 1] : undefined
  }

  // --- Credits --------------------------------------------------------------

  /**
   * Hands back whatever was reserved but never consumed, and squares the Run's
   * own bookkeeping so a later `retry` reserves from a truthful baseline.
   */
  async function releaseUnused(run: Run): Promise<void> {
    const unused = run.creditsReserved - run.creditsConsumed
    if (unused > 0) {
      await deps.credits.release({
        userId: run.target.userId,
        runId: run.id,
        amount: unused,
      })
    }
    run.creditsReserved = run.creditsConsumed
  }

  // --- Terminal transitions -------------------------------------------------

  function failRunInPlace(run: Run, error: string, retryable: boolean): void {
    run.status = 'failed'
    run.error = error
    run.retryable = retryable
  }

  function failStep(step: Step, error: string): void {
    step.status = 'failed'
    step.error = error
  }

  // --- fal ------------------------------------------------------------------

  async function completeStep(run: Run, step: Step, sourceUrl: string): Promise<void> {
    let hosted: string
    try {
      // fal's result is only retrievable for about an hour, so rehost now.
      hosted = await deps.media.rehost({
        target: run.target,
        runId: run.id,
        step,
        sourceUrl,
      })
    } catch (err) {
      failStep(step, errorMessage(err, 'Failed to rehost the fal result'))
      return
    }

    step.resultUrl = hosted
    step.status = 'completed'

    const outstanding = step.credits - step.creditsConsumed
    if (outstanding > 0) {
      await deps.credits.consume({
        userId: run.target.userId,
        runId: run.id,
        stepId: step.id,
        amount: outstanding,
      })
      step.creditsConsumed += outstanding
      run.creditsConsumed += outstanding
    }
  }

  /**
   * Converges one running Step with fal's queue. `COMPLETED` carrying an error
   * is fal reporting failure — there is no `FAILED` queue status to look for.
   */
  async function reconcileStep(run: Run, step: Step): Promise<void> {
    if (!step.providerEndpoint || !step.providerRequestId) {
      failStep(step, 'Step is running without fal provider ids')
      return
    }

    const status = await deps.fal.status(step.providerEndpoint, step.providerRequestId)

    if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') return

    if (status.status === 'NOT_FOUND') {
      failStep(step, 'fal has no record of this request; its result window has closed')
      return
    }

    if (status.error) {
      failStep(step, status.error)
      return
    }

    const result = await deps.fal.result(step.providerEndpoint, step.providerRequestId)
    if (!result.found) {
      failStep(step, 'fal no longer has a result for this request')
      return
    }

    const url = extractVideoUrl(result.data)
    if (!url) {
      failStep(step, 'fal result did not contain a media URL')
      return
    }

    await completeStep(run, step, url)
  }

  /**
   * Submits every pending Step in a stage. Returns an error message when the
   * enqueue itself failed — the Run is then terminal and retryable rather than
   * left `running` with no provider ids to reconcile against.
   */
  async function submitStage(run: Run, stage: number, plan: RunPlan): Promise<string | null> {
    const previousResultUrls = completedResultUrls(run)

    for (const step of stepsInStage(run, stage)) {
      if (step.status !== 'pending') continue

      const index = run.steps.indexOf(step)
      const stepPlan = plan.steps[index]
      if (!stepPlan) {
        return `The planner returned no Step at index ${index} for this Target`
      }

      try {
        const input = await stepPlan.buildInput({ run, previousResultUrls })
        const submitted = await deps.fal.submit({
          endpoint: stepPlan.endpoint,
          input,
          webhookUrl: deps.webhooks?.forStep({ runId: run.id, stepId: step.id }),
        })
        step.providerEndpoint = stepPlan.endpoint
        step.providerRequestId = submitted.requestId
        step.status = 'running'
      } catch (err) {
        return errorMessage(err, 'Failed to enqueue the fal request')
      }
    }

    return null
  }

  async function applyAndComplete(run: Run): Promise<void> {
    const videoUrl = finalResultUrl(run)
    if (!videoUrl) {
      failRunInPlace(run, 'Every Step completed without producing a media URL', false)
      await releaseUnused(run)
      return
    }

    try {
      await deps.sink.apply({ target: run.target, run, videoUrl })
    } catch (err) {
      failRunInPlace(run, errorMessage(err, 'Failed to apply the result to the Target'), true)
      await releaseUnused(run)
      return
    }

    run.status = 'completed'
    run.error = undefined
    run.retryable = undefined
    // Settle: the user keeps whatever was reserved for work that never ran.
    await releaseUnused(run)
  }

  /**
   * The single converge path, shared by `start`, `get` and `onWebhook`. Walks
   * the Run forward as far as it can: submit a pending stage, reconcile a
   * running one, advance when a stage finishes, and apply the result when the
   * last Step is done. Idempotent once the Run is terminal.
   */
  async function converge(run: Run): Promise<Run> {
    if (isTerminal(run)) return run

    let plan: RunPlan | undefined

    // Each pass either submits a stage, completes the Run, or stops. The bound
    // is a guard, not a schedule.
    for (let pass = 0; pass <= run.steps.length + 1; pass++) {
      const stage = currentStage(run)

      if (stage === null) {
        await applyAndComplete(run)
        break
      }

      const steps = stepsInStage(run, stage)

      if (steps.some((step) => step.status === 'pending')) {
        plan ??= await deps.planner.plan(run.target)
        const enqueueError = await submitStage(run, stage, plan)
        if (enqueueError) {
          failRunInPlace(run, enqueueError, true)
          await releaseUnused(run)
        } else {
          run.status = 'running'
        }
        break
      }

      for (const step of steps) {
        if (step.status === 'running') await reconcileStep(run, step)
      }

      const failed = steps.find((step) => step.status === 'failed')
      if (failed) {
        failRunInPlace(run, failed.error ?? 'A Step failed', true)
        await releaseUnused(run)
        break
      }

      // Stage finished — loop round to submit the next one or complete the Run.
      if (steps.every((step) => step.status === 'completed')) continue

      break
    }

    run.updatedAt = now()
    return await deps.store.save(run)
  }

  // --- Operations -----------------------------------------------------------

  async function start(target: TargetRef): Promise<Run> {
    const existing = await deps.store.findCurrentByTarget(target)
    if (existing && isInFlight(existing)) return existing

    const plan = await deps.planner.plan(target)
    const timestamp = now()
    const runId = newId()

    const run: Run = {
      id: runId,
      target,
      status: 'pending',
      steps: plan.steps.map((stepPlan) => ({
        id: newId(),
        kind: stepPlan.kind,
        stage: stepPlan.stage,
        status: 'pending',
        credits: stepPlan.credits,
        creditsConsumed: 0,
      })),
      creditsReserved: plan.steps.reduce((total, stepPlan) => total + stepPlan.credits, 0),
      creditsConsumed: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const created = await deps.store.create(run)

    if (created.creditsReserved > 0) {
      try {
        await deps.credits.reserve({
          userId: target.userId,
          runId: created.id,
          amount: created.creditsReserved,
        })
      } catch (err) {
        // Never leave a Run in flight that was never paid for.
        failRunInPlace(created, errorMessage(err, 'Failed to reserve credits'), false)
        created.creditsReserved = 0
        created.updatedAt = now()
        await deps.store.save(created)
        throw err
      }
    }

    return await converge(created)
  }

  async function get(target: TargetRef): Promise<Run | null> {
    const run = await deps.store.findCurrentByTarget(target)
    if (!run) return null
    if (isTerminal(run)) return run
    return await converge(run)
  }

  async function cancel(runId: string): Promise<Run> {
    const run = await requireRun(runId)
    if (isTerminal(run)) return run

    for (const step of run.steps) {
      if (step.status !== 'running') continue
      if (step.providerEndpoint && step.providerRequestId) {
        try {
          // Best effort. fal may still finish a marketplace job that ignores
          // cancel; a late result for an aborted Run is discarded on arrival.
          await deps.fal.cancel(step.providerEndpoint, step.providerRequestId)
        } catch {
          // Cancelling our own Run must not fail because fal said no.
        }
      }
      step.status = 'aborted'
    }
    for (const step of run.steps) {
      if (step.status === 'pending') step.status = 'aborted'
    }

    run.status = 'aborted'
    await releaseUnused(run)
    run.updatedAt = now()
    return await deps.store.save(run)
  }

  async function retry(runId: string): Promise<Run> {
    const run = await requireRun(runId)
    if (run.status !== 'failed') throw new RunNotRetryableError(run.status)

    const replayed = run.steps.filter((step) => step.status !== 'completed')

    for (const step of replayed) {
      step.status = 'pending'
      step.error = undefined
      step.providerEndpoint = undefined
      step.providerRequestId = undefined
    }

    // Pay only for work that will actually run again. A brainrot subtitle-only
    // retry does not re-reserve the compose it already paid for.
    const amount = replayed.reduce(
      (total, step) => total + Math.max(0, step.credits - step.creditsConsumed),
      0,
    )
    if (amount > 0) {
      await deps.credits.reserve({ userId: run.target.userId, runId: run.id, amount })
      run.creditsReserved += amount
    }

    run.status = 'running'
    run.error = undefined
    run.retryable = undefined

    return await converge(run)
  }

  async function onWebhook(params: {
    runId: string
    stepId: string
    body: FalWebhookBody
  }): Promise<Run> {
    const run = await requireRun(params.runId)

    // A cancelled, completed or failed Run ignores a late delivery.
    if (isTerminal(run)) return run

    const step = run.steps.find((candidate) => candidate.id === params.stepId)
    // At-least-once delivery: a Step that is already terminal is a no-op.
    if (!step || step.status !== 'running') return run

    if (params.body.status === 'ERROR') {
      failStep(step, params.body.error ?? 'fal reported an error')
    } else {
      const url = extractVideoUrl(params.body.payload ?? {})
      if (url) {
        await completeStep(run, step, url)
      } else {
        // Same converge as reconcile — ask fal rather than trust a thin body.
        await reconcileStep(run, step)
      }
    }

    return await converge(run)
  }

  async function progress(runId: string): Promise<RunProgress | null> {
    const run = await deps.store.findById(runId)
    if (!run) return null

    const stage = currentStage(run)
    const currentStep = stage === null ? undefined : stepsInStage(run, stage)[0]

    return {
      runId: run.id,
      status: run.status,
      // A terminal Run has no phase — it must never render as loading.
      phase: isInFlight(run) && currentStep ? phaseForKind(currentStep.kind) : null,
      error: run.error,
      retryable: run.retryable,
      videoUrl: run.status === 'completed' ? finalResultUrl(run) : undefined,
    }
  }

  async function requireRun(runId: string): Promise<Run> {
    const run = await deps.store.findById(runId)
    if (!run) throw new RunNotFoundError(runId)
    return run
  }

  return { start, get, cancel, retry, onWebhook, progress }
}

// --- fal payload shapes -------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asUrl(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Pulls the media URL out of a fal result. `ffmpeg-api/compose` returns
 * `video_url`; `workflow-utilities/auto-subtitle` returns `video.url`; the
 * asset models used by lofi return audio or image shapes.
 */
export function extractVideoUrl(data: Record<string, unknown>): string | undefined {
  const direct = asUrl(data.video_url) ?? asUrl(data.url)
  if (direct) return direct

  const nested = asRecord(data.video) ?? asRecord(data.audio) ?? asRecord(data.image)
  const nestedUrl = nested ? asUrl(nested.url) : undefined
  if (nestedUrl) return nestedUrl

  const images = Array.isArray(data.images) ? data.images : undefined
  const first = images && images.length > 0 ? asRecord(images[0]) : undefined
  return first ? asUrl(first.url) : undefined
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}
