import type { SceneDensity, StickStyle, VoiceTone, ImageModel, TextModel, StreamEvent, Scene, StoryData, VideoModel, VideoQuality } from '@/shared/lib/types'
import { getImageProvider } from '@/shared/lib/providers/image'
import { getTextProvider } from '@/shared/lib/providers/text'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { upsertStoryWithScenes } from '@/features/stories/server/stories-db'
import { fireAndForgetUsage } from '@/features/billing/server/usage'
import { clearStoryAssetsBeforeRegenerate, completeSceneImage } from '@/features/stories/server/story-assets'

export const runtime = 'nodejs'
export const maxDuration = 300

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
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  const { storyId, story, density, style, tone, imageModel, videoModel, videoQuality, textModel, category } = body as {
    storyId: string
    story: string
    density: SceneDensity
    style: StickStyle
    tone: VoiceTone
    imageModel?: ImageModel
    videoModel?: VideoModel
    videoQuality?: VideoQuality
    textModel?: TextModel
    category?: string
  }

  if (!storyId || !story || !density || !style || !tone) {
    return new Response(JSON.stringify({ error: 'Missing required fields: storyId, story, density, style, tone' }), { status: 400 })
  }

  const balance = await getCredits(userId)
  if (balance < 1) {
    return new Response(JSON.stringify({ error: 'insufficient_credits', balance, required: 1 }), { status: 402 })
  }

  const textProvider = getTextProvider(textModel)
  const isNvidia = textProvider.id.startsWith('nvidia/')
  const isGroq = textProvider.id.startsWith('groq/')

  if (!isNvidia && !isGroq && !process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), { status: 500 })
  }
  if (isNvidia && !process.env.NVIDIA_API_KEY) {
    return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY is not configured' }), { status: 500 })
  }
  if (isGroq && !process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not configured' }), { status: 500 })
  }

  const imageProvider = getImageProvider(imageModel)
  if (!process.env.FAL_KEY) {
    return new Response(JSON.stringify({ error: 'FAL_KEY is not configured' }), { status: 500 })
  }

  const creditsPerScene = IMAGE_MODEL_CREDITS[imageModel ?? 'flux-schnell-fal'] ?? 1
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
  const signal = request.signal

  const encoder = new TextEncoder()
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: StreamEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))
        } catch {
          // controller closed
        }
      }
      const isAbort = (err: unknown) =>
        signal.aborted ||
        (err instanceof Error && (err.name === 'AbortError' || err.message === 'aborted'))
      const throwIfAborted = async () => {
        if (signal.aborted) throw new DOMException('aborted', 'AbortError')
      }

      const onAbort = () => {
        if (!closed) {
          closed = true
          try { controller.close() } catch {}
        }
      }
      signal.addEventListener('abort', onAbort, { once: true })

      try {
        await throwIfAborted()
        send({ type: 'stage', id: 'analyze', status: 'active', detail: 'Reading your story' })
        send({ type: 'stage', id: 'plan', status: 'pending' })
        send({ type: 'stage', id: 'images', status: 'pending' })

        send({ type: 'stage', id: 'analyze', status: 'done' })
        send({ type: 'stage', id: 'plan', status: 'active', detail: `Planning scenes with ${textProvider.label}` })

        const plan = await textProvider.planStory(story, density, style, tone, signal, {
          userId,
          storyId,
          operation: 'text_plan',
        })
        await throwIfAborted()
        send({ type: 'story', title: plan.title, tagline: plan.tagline, protagonist: plan.protagonist })
        send({ type: 'thumbnail-prompt', prompt: plan.thumbnailPrompt })

        const finalScenes: Scene[] = []
        for (const p of plan.scenes) {
          const scene: Scene = { ...p, imageUrl: null, voiceoverUrl: null, videoUrl: null }
          finalScenes.push(scene)
          send({ type: 'scene-planned', scene })
        }

        send({ type: 'stage', id: 'plan', status: 'done', detail: `${plan.scenes.length} scenes` })
        send({ type: 'info', message: `Using image provider: ${imageProvider.id}` })

        try {
          await clearStoryAssetsBeforeRegenerate(storyId, userId)
          await upsertStoryWithScenes({
            storyId,
            userId,
            category: category ?? 'stickman',
            storyInput: story,
            options: {
              density,
              style,
              tone,
              imageModel: imageModel ?? 'flux-schnell-fal',
              videoModel: videoModel ?? 'ltx-video-fal',
              videoQuality: videoQuality ?? '720p',
              textModel: textModel ?? 'gemini-2.5-flash',
            },
            storyData: {
              title: plan.title,
              tagline: plan.tagline,
              protagonist: plan.protagonist,
              thumbnailPrompt: plan.thumbnailPrompt,
              thumbnailUrl: null,
              scenes: finalScenes,
            },
            status: 'generating',
          })
        } catch (persistErr) {
          console.error('Failed to persist story scaffold', persistErr)
        }

        send({
          type: 'stage',
          id: 'images',
          status: 'active',
          detail: `Generating ${plan.scenes.length} images (${imageProvider.id})`,
        })

        let done = 0
        const total = plan.scenes.length
        send({ type: 'image-progress', done, total })

        for (const scene of plan.scenes) {
          await throwIfAborted()
          try {
            const { mimeType, data } = await imageProvider.generate(scene.imagePrompt, {
              aspectRatio: '16:9',
              signal,
              costContext: {
                userId,
                storyId,
                sceneId: scene.id,
                creditsCharged: creditsPerScene,
                operation: 'scene_image',
              },
            })
            await throwIfAborted()

            const deduction = await deductCredits(userId, creditsPerScene)
            if (!deduction.ok) {
              send({ type: 'insufficient_credits', required: creditsPerScene, balance: deduction.balance })
              break
            }

            let imageUrl: string
            if (hasBlobToken) {
              imageUrl = await completeSceneImage({
                storyId,
                sceneId: scene.id,
                userId,
                data,
                mimeType,
              })
            } else {
              imageUrl = `data:${mimeType};base64,${data.toString('base64')}`
            }

            await throwIfAborted()
            const idx = finalScenes.findIndex((s) => s.id === scene.id)
            if (idx >= 0) finalScenes[idx] = { ...finalScenes[idx], imageUrl }
            send({ type: 'scene-image', sceneId: scene.id, imageUrl })
            fireAndForgetUsage({
              userId,
              meter: 'image_gen',
              route: '/api/generate',
              quantity: creditsPerScene,
              metadata: { provider: imageProvider.id, sceneId: scene.id },
            })
          } catch (err) {
            if (isAbort(err)) throw err
            send({
              type: 'scene-image-error',
              sceneId: scene.id,
              error: err instanceof Error ? err.message : 'Image generation failed',
            })
          } finally {
            done += 1
            if (!signal.aborted) send({ type: 'image-progress', done, total })
          }
        }

        send({ type: 'stage', id: 'images', status: 'done', detail: `${done}/${total} images` })

        try {
          const storyData: StoryData = {
            title: plan.title,
            tagline: plan.tagline,
            protagonist: plan.protagonist,
            thumbnailPrompt: plan.thumbnailPrompt,
            thumbnailUrl: null,
            scenes: finalScenes,
          }
          await upsertStoryWithScenes({
            storyId,
            userId,
            category: category ?? 'stickman',
            storyInput: story,
            options: {
              density,
              style,
              tone,
              imageModel: imageModel ?? 'flux-schnell-fal',
              videoModel: videoModel ?? 'ltx-video-fal',
              videoQuality: videoQuality ?? '720p',
              textModel: textModel ?? 'gemini-2.5-flash',
            },
            storyData,
            status: 'ready',
          })
        } catch (persistErr) {
          console.error('Failed to persist story', persistErr)
        }

        fireAndForgetUsage({
          userId,
          meter: 'story_gen',
          route: '/api/generate',
          quantity: 1,
          metadata: { storyId, sceneCount: finalScenes.length, textModel: textProvider.id },
        })
        send({ type: 'stage', id: 'done', status: 'done' })
        send({ type: 'complete' })
      } catch (err) {
        if (!isAbort(err)) {
          console.error('Generate stream error:', err)
          send({
            type: 'error',
            error: err instanceof Error ? err.message : 'Generation failed',
          })
        }
      } finally {
        signal.removeEventListener('abort', onAbort)
        if (!closed) {
          closed = true
          try { controller.close() } catch {}
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
