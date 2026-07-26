import { randomUUID } from 'node:crypto'
import { auth, tasks } from '@trigger.dev/sdk/v3'
import { getPipeline } from '@/features/chat/pipelines'
import { appendDecision, createRun, updateRun } from '@/features/chat/server/runs-db'
import { routePrompt } from '@/features/chat/server/router'
import {
  emptyStoryFromBrief,
  generateOptionsFromPipeline,
} from '@/features/chat/server/story-mapper'
import { upsertStoryWithScenes } from '@/features/stories/server/stories-db'
import { env } from '@/shared/lib/env'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!env.TRIGGER_SECRET_KEY) {
    return Response.json({ error: 'Chat production is not configured' }, { status: 503 })
  }

  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const body = await request.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) {
    return Response.json({ error: 'Missing prompt' }, { status: 400 })
  }

  const { brief, fellBack } = await routePrompt(prompt)
  const pipeline = getPipeline(brief.pipeline)
  if (!pipeline) {
    return Response.json({ error: 'Invalid pipeline' }, { status: 500 })
  }

  const runId = randomUUID()
  const storyId = randomUUID()
  const userId = session.user.id

  await upsertStoryWithScenes({
    storyId,
    userId,
    category: pipeline.storyCategory,
    storyInput: prompt,
    options: generateOptionsFromPipeline(pipeline),
    storyData: emptyStoryFromBrief(brief),
    status: 'generating',
  })
  await createRun({ runId, storyId, userId, prompt, pipeline: pipeline.id, brief })

  await appendDecision(runId, {
    category: 'pipeline_selection',
    subject: 'Production pipeline',
    choice: pipeline.id,
    optionsConsidered: [pipeline.id],
    rejectedBecause: fellBack ? 'Router returned unknown pipeline; fell back' : undefined,
  })

  const handle = await tasks.trigger('chat-production', { runId, storyId, userId })
  await updateRun(runId, { triggerRunId: handle.id, stage: 'plan' })

  const publicAccessToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  })

  return Response.json({
    runId,
    storyId,
    triggerRunId: handle.id,
    publicAccessToken,
  })
}
