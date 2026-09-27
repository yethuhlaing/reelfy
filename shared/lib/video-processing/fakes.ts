/**
 * In-memory adapters for the Video processing kernel's ports.
 *
 * The kernel is tested against these rather than against Next routes,
 * EventSource or Redis: if a bug is "refresh lost the Run", the failing test is
 * `start` -> drop every client -> `get(Target)`, not a browser refresh.
 */

import { InFlightRunExistsError } from './errors'
import type {
  Credits,
  FalQueue,
  FalQueueResult,
  FalQueueStatus,
  FalSubmitRequest,
  MediaStore,
  ResultSink,
  Run,
  RunPlan,
  RunPlanner,
  RunStore,
  Step,
  StepKind,
  StepPlan,
  TargetRef,
  WebhookUrls,
} from './types'
import { isInFlight, sameTarget } from './types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

// --- Run store ----------------------------------------------------------------

export class FakeRunStore implements RunStore {
  /** Insertion-ordered, so "current" is unambiguous even within one clock tick. */
  private rows: Run[] = []

  async create(run: Run): Promise<Run> {
    const current = await this.findCurrentByTarget(run.target)
    if (current && isInFlight(current)) {
      throw new InFlightRunExistsError(current.id)
    }
    this.rows.push(clone(run))
    return clone(run)
  }

  async findCurrentByTarget(target: TargetRef): Promise<Run | null> {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (sameTarget(this.rows[i].target, target)) return clone(this.rows[i])
    }
    return null
  }

  async findById(runId: string): Promise<Run | null> {
    const row = this.rows.find((run) => run.id === runId)
    return row ? clone(row) : null
  }

  async save(run: Run): Promise<Run> {
    const index = this.rows.findIndex((row) => row.id === run.id)
    if (index === -1) this.rows.push(clone(run))
    else this.rows[index] = clone(run)
    return clone(run)
  }

  /** Test-only: how many Runs this Target has accumulated. */
  countForTarget(target: TargetRef): number {
    return this.rows.filter((run) => sameTarget(run.target, target)).length
  }
}

// --- fal queue ----------------------------------------------------------------

interface FakeRequest {
  endpoint: string
  status: FalQueueStatus
  result: FalQueueResult
}

export class FakeFalQueue implements FalQueue {
  readonly submits: FalSubmitRequest[] = []
  readonly cancels: Array<{ endpoint: string; requestId: string }> = []
  readonly statusChecks: Array<{ endpoint: string; requestId: string }> = []

  private requests = new Map<string, FakeRequest>()
  private counter = 0
  private submitError: Error | null = null

  async submit(request: FalSubmitRequest): Promise<{ requestId: string }> {
    if (this.submitError) {
      const err = this.submitError
      this.submitError = null
      throw err
    }
    this.submits.push(clone(request))
    const requestId = `fal-req-${++this.counter}`
    this.requests.set(requestId, {
      endpoint: request.endpoint,
      status: { status: 'IN_QUEUE' },
      result: { found: false },
    })
    return { requestId }
  }

  async status(endpoint: string, requestId: string): Promise<FalQueueStatus> {
    this.statusChecks.push({ endpoint, requestId })
    return this.requests.get(requestId)?.status ?? { status: 'NOT_FOUND' }
  }

  async result(_endpoint: string, requestId: string): Promise<FalQueueResult> {
    return this.requests.get(requestId)?.result ?? { found: false }
  }

  async cancel(endpoint: string, requestId: string): Promise<void> {
    this.cancels.push({ endpoint, requestId })
  }

  // --- controls ---

  /** The request id fal handed back for the Nth submit (1-based). */
  requestIdAt(index: number): string {
    return `fal-req-${index}`
  }

  lastRequestId(): string {
    return `fal-req-${this.counter}`
  }

  inProgress(requestId: string): void {
    this.patch(requestId, { status: { status: 'IN_PROGRESS' } })
  }

  /** fal finished and the result is there. */
  complete(requestId: string, data: Record<string, unknown>): void {
    this.patch(requestId, {
      status: { status: 'COMPLETED' },
      result: { found: true, data },
    })
  }

  /** fal finished with a video. The common success shape for ffmpeg compose. */
  completeWithVideo(requestId: string, videoUrl: string): void {
    this.complete(requestId, { video_url: videoUrl })
  }

  /** fal's way of reporting failure: `COMPLETED` carrying an error. */
  completeWithError(requestId: string, error: string): void {
    this.patch(requestId, {
      status: { status: 'COMPLETED', error },
      result: { found: false },
    })
  }

  /** Completed, but the ~1h queue-result window has since closed. */
  completeButLoseResult(requestId: string): void {
    this.patch(requestId, {
      status: { status: 'COMPLETED' },
      result: { found: false },
    })
  }

  /** fal has no record of the request at all. */
  forget(requestId: string): void {
    this.requests.delete(requestId)
  }

  /** Make the next `submit` throw, standing in for an enqueue failure. */
  failNextSubmit(message = 'fal submit failed'): void {
    this.submitError = new Error(message)
  }

  private patch(requestId: string, patch: Partial<FakeRequest>): void {
    const existing = this.requests.get(requestId) ?? {
      endpoint: 'unknown',
      status: { status: 'IN_QUEUE' } as FalQueueStatus,
      result: { found: false } as FalQueueResult,
    }
    this.requests.set(requestId, { ...existing, ...patch })
  }
}

// --- credits ------------------------------------------------------------------

export type CreditCall =
  | { op: 'reserve'; runId: string; amount: number }
  | { op: 'consume'; runId: string; stepId: string; amount: number }
  | { op: 'release'; runId: string; amount: number }

export class FakeCredits implements Credits {
  readonly calls: CreditCall[] = []
  balance: number

  constructor(balance = 1000) {
    this.balance = balance
  }

  async reserve(params: { userId: string; runId: string; amount: number }): Promise<void> {
    if (params.amount > this.balance) {
      throw new Error(`Insufficient credits: have ${this.balance}, need ${params.amount}`)
    }
    this.balance -= params.amount
    this.calls.push({ op: 'reserve', runId: params.runId, amount: params.amount })
  }

  async consume(params: {
    userId: string
    runId: string
    stepId: string
    amount: number
  }): Promise<void> {
    this.calls.push({
      op: 'consume',
      runId: params.runId,
      stepId: params.stepId,
      amount: params.amount,
    })
  }

  async release(params: { userId: string; runId: string; amount: number }): Promise<void> {
    this.balance += params.amount
    this.calls.push({ op: 'release', runId: params.runId, amount: params.amount })
  }

  countOf(op: CreditCall['op']): number {
    return this.calls.filter((call) => call.op === op).length
  }

  totalOf(op: CreditCall['op']): number {
    return this.calls
      .filter((call) => call.op === op)
      .reduce((total, call) => total + call.amount, 0)
  }
}

// --- media --------------------------------------------------------------------

export class FakeMediaStore implements MediaStore {
  readonly rehosted: string[] = []
  failNext = false

  async rehost(params: { sourceUrl: string; runId: string; step: Step; target: TargetRef }): Promise<string> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('rehost failed')
    }
    this.rehosted.push(params.sourceUrl)
    return `rehosted:${params.sourceUrl}`
  }
}

// --- result sink --------------------------------------------------------------

export class FakeResultSink implements ResultSink {
  readonly applied: Array<{ target: TargetRef; runId: string; videoUrl: string }> = []
  failNext = false

  async apply(params: { target: TargetRef; run: Run; videoUrl: string }): Promise<void> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('sink failed')
    }
    this.applied.push({
      target: clone(params.target),
      runId: params.run.id,
      videoUrl: params.videoUrl,
    })
  }

  /** What a client reading only the Target would see. */
  videoUrlFor(target: TargetRef): string | undefined {
    for (let i = this.applied.length - 1; i >= 0; i--) {
      if (sameTarget(this.applied[i].target, target)) return this.applied[i].videoUrl
    }
    return undefined
  }
}

// --- planner ------------------------------------------------------------------

export function fakePlanner(build: (target: TargetRef) => RunPlan): RunPlanner {
  return { plan: async (target) => build(target) }
}

/** A Step plan whose fal input does not depend on earlier Steps. */
export function step(
  kind: StepKind,
  options: {
    stage?: number
    endpoint?: string
    credits?: number
    optional?: boolean
    ref?: string
  } = {},
): StepPlan {
  return {
    kind,
    stage: options.stage ?? 0,
    endpoint: options.endpoint ?? `fal-ai/test/${kind}`,
    credits: options.credits ?? 0,
    optional: options.optional,
    ref: options.ref,
    buildInput: () => ({ kind }),
  }
}

/** A Step plan that feeds on the previous Step's rehosted URL, like subtitling. */
export function stepFromPrevious(
  kind: StepKind,
  options: { stage?: number; endpoint?: string; credits?: number; optional?: boolean } = {},
): StepPlan {
  return {
    ...step(kind, options),
    buildInput: ({ previousResultUrls }) => ({
      kind,
      videoUrl: previousResultUrls[previousResultUrls.length - 1],
    }),
  }
}

export const fakeWebhookUrls: WebhookUrls = {
  forStep: ({ runId, stepId }) => `https://webhook.test/api/webhooks/fal/video/run/${runId}/${stepId}`,
}
