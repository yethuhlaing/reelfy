import { openai } from '@ai-sdk/openai'
import { metadata, task, wait } from '@trigger.dev/sdk/v3'
import { DEFAULT_PIPELINE_ID, getPipeline } from '@/features/chat/pipelines'
import type { Brief, ScenePlan } from '@/features/chat/pipelines/schemas'
import {
  estimateRunCredits,
  releaseHold,
  reserveForRun,
} from '@/features/billing/server/run-credits'
import {
  appendDecision,
  getRun,
  updateRun,
} from '@/features/chat/server/runs-db'
import {
  generateOptionsFromPipeline,
  scenePlanToStoryData,
  summarizePlan,
} from '@/features/chat/server/story-mapper'
import { generateValidated } from '@/features/chat/server/validate'
import { buildTools, runAssetsStep } from '@/features/chat/tools'
import { upsertStoryWithScenes } from '@/features/stories/server/stories-db'
import type { Pipeline } from '@/features/chat/pipelines/types'

type TaskPayload = { runId: string; storyId: string; userId: string }

export const chatProduction = task({
  id: 'chat-production',
  maxDuration: 1800,
  run: async ({ runId, storyId, userId }: TaskPayload) => {
    const run = await getRun(runId)
    if (!run) throw new Error(`Run not found: ${runId}`)

    const pipeline = getPipeline(run.pipeline ?? DEFAULT_PIPELINE_ID)
    if (!pipeline) throw new Error(`Unknown pipeline: ${run.pipeline}`)

    const brief = run.brief as Brief

    metadata.set('stage', 'plan')
    await updateRun(runId, { stage: 'plan', status: 'running' })

    const plan = await planStep(runId, brief, pipeline)
    await persistScaffold(storyId, userId, pipeline, plan)

    const estimate = estimateRunCredits(brief, plan, pipeline)
    await updateRun(runId, {
      costEstimate: estimate,
      stage: 'gate',
      status: 'awaiting_approval',
    })

    metadata.set('stage', 'gate')
    metadata.set('gate', {
      estimate,
      plan: summarizePlan(plan),
      providers: pipeline.defaults,
    })

    const token = await wait.createToken({ timeout: '24h' })
    await updateRun(runId, { gateToken: token.id })
    metadata.set('gateTokenId', token.id)

    const gate = await wait.forToken<{ approved: boolean }>(token)
    if (!gate.ok || !gate.output?.approved) {
      await updateRun(runId, {
        stage: 'failed',
        status: gate.ok ? 'cancelled' : 'failed',
        gateToken: null,
      })
      return { cancelled: true }
    }

    const res = await reserveForRun(runId, userId, estimate)
    if (!res.ok) {
      metadata.set('error', { code: 'insufficient_credits', balance: res.balance })
      await updateRun(runId, {
        stage: 'failed',
        status: 'failed',
        error: 'insufficient_credits',
        gateToken: null,
      })
      return { insufficientCredits: true }
    }

    await updateRun(runId, { stage: 'assets', status: 'running', gateToken: null })
    metadata.set('stage', 'assets')

    const ctx = { runId, storyId, userId }
    await runAssetsStep(ctx, pipeline, plan)

    await updateRun(runId, { stage: 'compose' })
    metadata.set('stage', 'compose')

    const tools = buildTools(ctx, pipeline)
    await tools.composeVideo()

    const { refunded } = await releaseHold(runId)
    const actual = estimate - refunded
    await updateRun(runId, { stage: 'done', status: 'ok', costActual: actual })
    metadata.set('done', { storyId, costActual: actual })

    return { storyId, costActual: actual }
  },
})

async function planStep(runId: string, brief: Brief, pipeline: Pipeline): Promise<ScenePlan> {
  const stage = pipeline.stages.find((s) => s.id === 'plan')
  if (!stage?.outputSchema) throw new Error('Plan stage missing output schema')

  const plan = await generateValidated({
    model: openai(pipeline.defaults.textModel),
    schema: stage.outputSchema,
    system: stage.systemPrompt,
    prompt: JSON.stringify(brief),
  })

  await appendDecision(runId, {
    category: 'plan',
    subject: 'Scene plan',
    choice: `${(plan as ScenePlan).scenes.length} scenes`,
  })

  return plan as ScenePlan
}

async function persistScaffold(
  storyId: string,
  userId: string,
  pipeline: Pipeline,
  plan: ScenePlan,
) {
  await upsertStoryWithScenes({
    storyId,
    userId,
    category: pipeline.storyCategory,
    storyInput: plan.title,
    options: generateOptionsFromPipeline(pipeline),
    storyData: scenePlanToStoryData(plan),
    status: 'generating',
  })
}
