import { generateVoiceover } from '@/shared/lib/integrations/elevenlabs'
import { getImageProvider } from '@/shared/lib/providers/image/image'
import { chargeAsset } from '@/features/billing/server/run-credits'
import { VISUAL_PRICING, RATES } from '@/features/billing/server/credit-catalog'
import { appendDecision } from '@/features/chat/server/runs-db'
import {
  ASSET_CONCURRENCY,
  IMAGE_TIMEOUT_MS,
  VOICE_TIMEOUT_MS,
  mapWithConcurrency,
  withTimeout,
} from '@/features/chat/server/concurrency'
import type { ScenePlan } from '@/features/chat/pipelines/schemas'
import type { Pipeline } from '@/features/chat/pipelines/types'
import { getStoryForUser, updateSceneForUser } from '@/features/stories/server/stories-db'
import { completeSceneImage, completeSceneVoiceover } from '@/features/stories/server/story-assets'
import { updateStoryMeta } from '@/features/stories/server/stories-db'

export type RunContext = {
  runId: string
  userId: string
  storyId: string
  signal?: AbortSignal
}

export function buildTools(ctx: RunContext, pipeline: Pipeline) {
  const image = getImageProvider(pipeline.defaults.imageModel)

  async function generateImage(sceneId: string, prompt: string) {
    const result = await getStoryForUser(ctx.storyId, ctx.userId)
    const existing = result?.scenes.find((s) => s.id === sceneId)
    if (existing?.imageUrl) {
      return { sceneId, imageUrl: existing.imageUrl, skipped: true as const }
    }

    const costUsd = VISUAL_PRICING[pipeline.defaults.imageModel]?.costUsd ?? 0.003
    const { mimeType, data } = await withTimeout(
      image.generate(prompt, {
        aspectRatio: '16:9',
        signal: ctx.signal,
        costContext: {
          userId: ctx.userId,
          storyId: ctx.storyId,
          sceneId,
          operation: 'scene_image',
        },
      }),
      IMAGE_TIMEOUT_MS,
      `Image ${sceneId}`,
    )

    const charge = await chargeAsset({
      runId: ctx.runId,
      assetId: `${sceneId}:image`,
      operation: 'scene_image',
      costUsd,
    })

    const imageUrl = await completeSceneImage({
      storyId: ctx.storyId,
      sceneId,
      userId: ctx.userId,
      data,
      mimeType,
    })

    await appendDecision(ctx.runId, {
      category: 'provider_selection',
      subject: `Image · ${sceneId}`,
      choice: image.id,
      costCredits: charge.charged,
    })

    return { sceneId, imageUrl, skipped: false as const }
  }

  async function generateVoice(sceneId: string, text: string) {
    const result = await getStoryForUser(ctx.storyId, ctx.userId)
    const existing = result?.scenes.find((s) => s.id === sceneId)
    if (existing?.voiceoverUrl) {
      return { sceneId, voiceoverUrl: existing.voiceoverUrl, skipped: true as const }
    }

    const costUsd = voiceCostUsd(text)
    const { audio, wordTimings } = await withTimeout(
      generateVoiceover(text, ctx.signal, {
        userId: ctx.userId,
        storyId: ctx.storyId,
        sceneId,
        operation: 'scene_voice',
      }),
      VOICE_TIMEOUT_MS,
      `Voice ${sceneId}`,
    )

    const charge = await chargeAsset({
      runId: ctx.runId,
      assetId: `${sceneId}:voice`,
      operation: 'scene_voice',
      costUsd,
    })

    const voiceoverUrl = await completeSceneVoiceover({
      storyId: ctx.storyId,
      sceneId,
      userId: ctx.userId,
      data: Buffer.from(audio),
    })

    await updateSceneForUser(ctx.storyId, sceneId, ctx.userId, {
      voiceoverWordTimings: wordTimings,
    })

    await appendDecision(ctx.runId, {
      category: 'provider_selection',
      subject: `Voice · ${sceneId}`,
      choice: 'elevenlabs',
      costCredits: charge.charged,
    })

    return { sceneId, voiceoverUrl, skipped: false as const }
  }

  async function composeVideo() {
    await updateStoryMeta(ctx.storyId, ctx.userId, { status: 'ready' })
    await appendDecision(ctx.runId, {
      category: 'compose',
      subject: 'Story status',
      choice: 'ready',
    })
    return { storyId: ctx.storyId, status: 'ready' as const }
  }

  return { generateImage, generateVoice, composeVideo }
}

function voiceCostUsd(text: string) {
  return Math.max(0.001, text.length * RATES.elevenLabsPerChar)
}

export async function runAssetsStep(
  ctx: RunContext,
  pipeline: Pipeline,
  plan: ScenePlan,
) {
  const tools = buildTools(ctx, pipeline)
  await mapWithConcurrency(plan.scenes, ASSET_CONCURRENCY, async (scene) => {
    await tools.generateImage(scene.id, scene.imagePrompt)
    await tools.generateVoice(scene.id, scene.voiceoverText)
  })
}
