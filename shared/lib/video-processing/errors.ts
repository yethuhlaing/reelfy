/** Errors the Video processing kernel and its ports raise. */

/**
 * A Target may have at most one in-flight Run. Stores enforce this (Postgres
 * with a partial unique index) so two concurrent `start` calls cannot both win.
 */
export class InFlightRunExistsError extends Error {
  readonly runId: string | undefined

  constructor(runId?: string) {
    super('An in-flight Run already exists for this Target')
    this.name = 'InFlightRunExistsError'
    this.runId = runId
  }
}

export class RunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Run not found: ${runId}`)
    this.name = 'RunNotFoundError'
  }
}

/** `retry` is only legal from `failed`. An aborted Run means starting a new one. */
export class RunNotRetryableError extends Error {
  readonly status: string

  constructor(status: string) {
    super(`Run is not retryable from status: ${status}`)
    this.name = 'RunNotRetryableError'
    this.status = status
  }
}
