import { redis } from '@/shared/lib/integrations/redis'
import type { Job, JobStatus, JobType } from './types'

const JOB_TTL_SECONDS = 86400

function jobKey(id: string): string {
  return `job:${id}`
}

function storyJobsKey(storyId: string): string {
  return `story:${storyId}:jobs`
}

function newJobId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function writeJob(job: Job): Promise<void> {
  await redis.set(jobKey(job.id), JSON.stringify(job), { ex: JOB_TTL_SECONDS })
}

export async function createJob<P>(
  type: JobType,
  payload: P & { storyId?: string },
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
  if (payload.storyId) {
    await redis.sadd(storyJobsKey(payload.storyId), job.id)
  }
  return job
}

export async function getJob<P = unknown, R = unknown>(
  id: string,
): Promise<Job<P, R> | null> {
  try {
    const raw = await redis.get<string | Job<P, R>>(jobKey(id))
    if (!raw) return null
    if (typeof raw === 'string') return JSON.parse(raw) as Job<P, R>
    return raw as Job<P, R>
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

export async function updateJobProvider<P>(
  id: string,
  providerRequestId: string,
  providerEndpoint: string,
  payload: P,
): Promise<void> {
  const existing = await getJob<P>(id)
  if (!existing) return
  const next = {
    ...existing,
    payload,
    providerRequestId,
    providerEndpoint,
    status: 'running' as JobStatus,
    updatedAt: Date.now(),
  }
  await writeJob(next as Job)
}

export async function getJobIdsForStory(storyId: string): Promise<string[]> {
  const ids = await redis.smembers<string[]>(storyJobsKey(storyId))
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export async function deleteJobsForStory(storyId: string): Promise<void> {
  const ids = await getJobIdsForStory(storyId)
  if (ids.length > 0) {
    await redis.del(...ids.map((id) => jobKey(id)))
  }
  await redis.del(storyJobsKey(storyId))
}
