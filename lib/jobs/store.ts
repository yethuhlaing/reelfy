import { put, head } from '@vercel/blob'
import type { Job, JobStatus, JobType } from './types'

const JOBS_PREFIX = 'jobs/'

function jobKey(id: string): string {
  return `${JOBS_PREFIX}${id}.json`
}

function newJobId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function writeJob(job: Job): Promise<void> {
  await put(jobKey(job.id), JSON.stringify(job), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  })
}

export async function createJob<P>(
  type: JobType,
  payload: P,
): Promise<Job<P>> {
  const now = Date.now()
  const job: Job<P> = {
    id: newJobId(),
    type,
    status: 'pending',
    payload,
    createdAt: now,
    updatedAt: now,
  }
  await writeJob(job as Job)
  return job
}

export async function getJob<P = unknown, R = unknown>(
  id: string,
): Promise<Job<P, R> | null> {
  try {
    const meta = await head(jobKey(id))
    const res = await fetch(meta.url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as Job<P, R>
  } catch {
    return null
  }
}

export async function updateJob<P = unknown, R = unknown>(
  id: string,
  patch: Partial<Pick<Job<P, R>, 'status' | 'result' | 'error' | 'providerRequestId' | 'providerEndpoint'>>,
): Promise<Job<P, R> | null> {
  const existing = await getJob<P, R>(id)
  if (!existing) return null
  const next: Job<P, R> = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }
  await writeJob(next as Job)
  return next
}

export async function markRunning(
  id: string,
  providerRequestId: string,
  providerEndpoint?: string,
): Promise<void> {
  await updateJob(id, {
    status: 'running' as JobStatus,
    providerRequestId,
    ...(providerEndpoint ? { providerEndpoint } : {}),
  })
}

export async function markCompleted<R>(id: string, result: R): Promise<void> {
  await updateJob(id, { status: 'completed' as JobStatus, result })
}

export async function markFailed(id: string, error: string): Promise<void> {
  await updateJob(id, { status: 'failed' as JobStatus, error })
}
