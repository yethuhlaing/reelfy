/**
 * Video processing kernel — domain types and injected ports.
 *
 * The kernel owns a Run's lifecycle (see CONTEXT.md for Run / Step / Target).
 * Everything that touches the outside world — fal's queue, the Run store,
 * credits, media rehosting, and writing the finished URL onto the Target — is a
 * port. The same lifecycle code runs against real adapters in production and
 * in-memory fakes in tests.
 */

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'aborted'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'aborted'

/** An inner fal call belonging to a Run, never a user-facing action of its own. */
export type StepKind = 'animate' | 'compose' | 'subtitle' | 'asset' | 'render'

/** What the user is waiting for. Projected from the current Step's kind. */
export type RunPhase = 'animating' | 'composing' | 'subtitling' | 'generating_assets' | 'rendering'

/** The product record a Run is for. */
export type TargetRef =
  | { kind: 'scene'; userId: string; storyId: string; sceneId: string }
  | { kind: 'story'; userId: string; storyId: string }
  | { kind: 'brainrotProject'; userId: string; projectId: string }
  | { kind: 'lofiVideo'; userId: string; videoId: string }

export type TargetKind = TargetRef['kind']

/**
 * The Target's stable id. Paired with `target.kind` this is the identity a Run
 * is unique-in-flight against.
 */
export function targetId(target: TargetRef): string {
  switch (target.kind) {
    case 'scene':
      return target.sceneId
    case 'story':
      return target.storyId
    case 'brainrotProject':
      return target.projectId
    case 'lofiVideo':
      return target.videoId
  }
}

export function sameTarget(a: TargetRef, b: TargetRef): boolean {
  return a.kind === b.kind && targetId(a) === targetId(b)
}

export interface Step {
  id: string
  kind: StepKind
  /**
   * Sequential group. Every Step in a stage is submitted together and the Run
   * only advances to `stage + 1` once all of them have completed. Animate and
   * story export have one stage of one Step; brainrot has two stages of one
   * (compose then subtitle); lofi has N asset Steps in stage 0 then one compose
   * Step in stage 1.
   */
  stage: number
  status: StepStatus
  /** Both provider ids are persisted on submit — reconcile needs the pair. */
  providerEndpoint?: string
  providerRequestId?: string
  /** Rehosted URL, set when the Step completes. */
  resultUrl?: string
  error?: string
  /** Credits reserved for this Step, and how many of them were consumed. */
  credits: number
  creditsConsumed: number
}

export interface Run {
  id: string
  target: TargetRef
  status: RunStatus
  steps: Step[]
  error?: string
  /** Whether a failed Run is worth retrying (a missing queue result is). */
  retryable?: boolean
  creditsReserved: number
  creditsConsumed: number
  createdAt: number
  updatedAt: number
}

export function isInFlight(run: Run): boolean {
  return run.status === 'pending' || run.status === 'running'
}

export function isTerminal(run: Run): boolean {
  return !isInFlight(run)
}

const PHASE_BY_KIND: Record<StepKind, RunPhase> = {
  animate: 'animating',
  compose: 'composing',
  subtitle: 'subtitling',
  asset: 'generating_assets',
  render: 'rendering',
}

export function phaseForKind(kind: StepKind): RunPhase {
  return PHASE_BY_KIND[kind]
}

/** Status + phase + error. The whole progress contract; transport is free. */
export interface RunProgress {
  runId: string
  status: RunStatus
  /** `null` once the Run is terminal — a terminal Run is never "loading". */
  phase: RunPhase | null
  error?: string
  retryable?: boolean
  /** Set once the Run has completed and the result was applied to the Target. */
  videoUrl?: string
}

// --- Ports ------------------------------------------------------------------

export interface FalSubmitRequest {
  endpoint: string
  input: Record<string, unknown>
  webhookUrl?: string
}

/**
 * fal's queue statuses, plus `NOT_FOUND` for a request whose result window has
 * closed. `COMPLETED` carrying an `error` is fal's way of reporting failure —
 * there is no `FAILED` or `ERROR` queue status.
 */
export type FalQueueStatus =
  | { status: 'IN_QUEUE' }
  | { status: 'IN_PROGRESS' }
  | { status: 'COMPLETED'; error?: string; errorType?: string }
  | { status: 'NOT_FOUND' }

export type FalQueueResult =
  | { found: true; data: Record<string, unknown> }
  | { found: false }

export interface FalQueue {
  submit(request: FalSubmitRequest): Promise<{ requestId: string }>
  status(endpoint: string, requestId: string): Promise<FalQueueStatus>
  result(endpoint: string, requestId: string): Promise<FalQueueResult>
  /** Best effort. fal may still finish an `IN_PROGRESS` marketplace job. */
  cancel(endpoint: string, requestId: string): Promise<void>
}

export interface RunStore {
  /** Throws `InFlightRunExistsError` if the Target already has an in-flight Run. */
  create(run: Run): Promise<Run>
  /** The most recently created Run for this Target, in flight or terminal. */
  findCurrentByTarget(target: TargetRef): Promise<Run | null>
  findById(runId: string): Promise<Run | null>
  save(run: Run): Promise<Run>
}

export interface Credits {
  /** Throws when the user cannot cover `amount`. */
  reserve(params: { userId: string; runId: string; amount: number }): Promise<void>
  consume(params: { userId: string; runId: string; stepId: string; amount: number }): Promise<void>
  release(params: { userId: string; runId: string; amount: number }): Promise<void>
}

/**
 * Downloads fal's media and rehosts it to our own storage. fal's queue result
 * is only retrievable for about an hour, so this happens the moment a Step
 * completes — a fal CDN URL is not durable storage.
 */
export interface MediaStore {
  rehost(params: {
    target: TargetRef
    runId: string
    step: Step
    sourceUrl: string
  }): Promise<string>
}

/** Writes the finished video URL onto the Target the way today's finalize helpers do. */
export interface ResultSink {
  apply(params: { target: TargetRef; run: Run; videoUrl: string }): Promise<void>
}

export interface StepInputContext {
  run: Run
  /** Rehosted result URLs of every already-completed Step, in Step order. */
  previousResultUrls: string[]
}

export interface StepPlan {
  kind: StepKind
  stage: number
  endpoint: string
  credits: number
  /** Built immediately before submit, so a later stage can use earlier results. */
  buildInput(context: StepInputContext): Promise<Record<string, unknown>> | Record<string, unknown>
}

export interface RunPlan {
  steps: StepPlan[]
}

/**
 * Supplies the Steps for a Target. Consulted on `start` and again on `retry`,
 * so callers never persist fal ids or replay logic themselves.
 */
export interface RunPlanner {
  plan(target: TargetRef): Promise<RunPlan>
}

/** Builds the fal webhook URL for one Step. */
export interface WebhookUrls {
  forStep(params: { runId: string; stepId: string }): string | undefined
}

/** The parsed fal webhook body. Signature verification stays a handler concern. */
export interface FalWebhookBody {
  /** fal's webhook vocabulary: `OK` or `ERROR`. */
  status?: string
  error?: string
  payload?: Record<string, unknown>
}
