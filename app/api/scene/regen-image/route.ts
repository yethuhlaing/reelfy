import { getImageProvider } from '@/shared/lib/providers/image/image'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { getStoryForUser, parseOptions, updateSceneForUser } from '@/features/stories/server/stories-db'
import { clearSceneVideo, completeSceneImage } from '@/features/stories/server/story-assets'
import { fireAndForgetUsage } from '@/features/billing/server/usage'
import type { ImageModel } from '@/shared/lib/types'
import { env } from '@/shared/lib/env'

export const runtime = 'nodejs'
export const maxDuration = 120

const IMAGE_MODEL_CREDITS: Record<ImageModel, number> = {
  'flux-schnell-fal': 1,
  'flux-dev-fal': 2,
  'sdxl-lightning-fal': 1,
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { storyId, sceneId } = body as { storyId?: string; sceneId?: string }
  if (!storyId || !sceneId) {
    return Response.json({ error: 'Missing storyId or sceneId' }, { status: 400 })
  }

  const result = await getStoryForUser(storyId, userId)
  if (!result) {
    return Response.json({ error: 'Story not found' }, { status: 404 })
  }

  const scene = result.scenes.find((s) => s.id === sceneId)
  if (!scene) {
    return Response.json({ error: 'Scene not found' }, { status: 404 })
  }
  if (!scene.imagePrompt?.trim()) {
    return Response.json({ error: 'Scene has no image prompt' }, { status: 400 })
  }

  const options = parseOptions(result.story.options)
  const imageModel = (options?.imageModel ?? 'flux-schnell-fal') as ImageModel
  const credits = IMAGE_MODEL_CREDITS[imageModel] ?? 1

  const balance = await getCredits(userId)
  if (balance < credits) {
    return Response.json(
      { error: 'insufficient_credits', balance, required: credits },
      { status: 402 },
    )
  }

  const imageProvider = getImageProvider(imageModel)
  const hasBlobToken = Boolean(env.BLOB_READ_WRITE_TOKEN)

  try {
    const { mimeType, data } = await imageProvider.generate(scene.imagePrompt, {
      aspectRatio: '16:9',
      costContext: {
        userId,
        storyId,
        sceneId,
        creditsCharged: credits,
        operation: 'scene_image_regen',
      },
    })

    const deduction = await deductCredits(userId, credits)
    if (!deduction.ok) {
      return Response.json(
        { error: 'insufficient_credits', balance: deduction.balance, required: credits },
        { status: 402 },
      )
    }

    let imageUrl: string
    if (hasBlobToken) {
      imageUrl = await completeSceneImage({
        storyId,
        sceneId,
        userId,
        data,
        mimeType,
      })
    } else {
      imageUrl = `data:${mimeType};base64,${data.toString('base64')}`
      const ok = await updateSceneForUser(storyId, sceneId, userId, { imageUrl })
      if (!ok) {
        return Response.json({ error: 'Failed to persist image' }, { status: 500 })
      }
    }

    await clearSceneVideo(storyId, sceneId, userId)

    fireAndForgetUsage({
      userId,
      meter: 'image_gen',
      route: '/api/scene/regen-image',
      quantity: credits,
      metadata: { provider: imageProvider.id, sceneId },
    })

    return Response.json({ url: imageUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('regen-image failed', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
