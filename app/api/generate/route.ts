import type { SceneDensity, StickStyle, VoiceTone, Format, ImageModel, TextModel, StreamEvent, Scene, StoryData, VideoModel, VideoQuality } from '@/shared/lib/types'
import { getImageProvider } from '@/shared/lib/providers/image/image'
import { getTextProvider } from '@/shared/lib/providers/text/text'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { VISUAL_PRICING } from '@/features/billing/server/credit-catalog'
import { upsertStoryWithScenes, updateStoryMeta } from '@/features/stories/server/stories-db'
import { toUserErrorMessage } from '@/shared/lib/user-error-message'
import { fireAndForgetUsage } from '@/features/billing/server/usage'
import { clearStoryAssetsBeforeRegenerate, completeSceneImage } from '@/features/stories/server/story-assets'
export const runtime = 'nodejs'
export const maxDuration = 300

// Credits per image model are derived from the central credit catalog (single
// source of truth) so story generation can't drift from lofi/other features.
function imageModelCredits(model: ImageModel): number {
  return VISUAL_PRICING[model]?.credits ?? 1
}

// How many scene images to generate concurrently, and how long one image may take
// before we give up on it (a hung fal queue call would otherwise block generation).
const IMAGE_CONCURRENCY = 4
const IMAGE_TIMEOUT_MS = 90_000

/** Reject if `promise` doesn't settle within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

/** Run `worker` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      await worker(items[i], i)
    }
  })
  await Promise.all(runners)
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  const { storyId, story, density, style, tone, format, imageModel, videoModel, videoQuality, textModel, category } = body as {
    storyId: string
    story: string
    density: SceneDensity
    style: StickStyle
    tone: VoiceTone
    format?: Format
    imageModel?: ImageModel
    videoModel?: VideoModel
    videoQuality?: VideoQuality
    textModel?: TextModel
    category?: string
  }
  // Backfill: older clients don't send format; default to the original narrative behavior.
  const resolvedFormat: Format = format ?? 'narrative'

  if (!storyId || !story || !density || !style || !tone) {
    return new Response(JSON.stringify({ error: 'Missing required fields: storyId, story, density, style, tone' }), { status: 400 })
  }

  const balance = await getCredits(userId)
  if (balance < 1) {
    return new Response(JSON.stringify({ error: 'insufficient_credits', balance, required: 1 }), { status: 402 })
  }

  const textProvider = getTextProvider(textModel)
  const imageProvider = getImageProvider(imageModel)
  const creditsPerScene = imageModelCredits(imageModel ?? 'flux-schnell-fal')
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

        const generateOptions = {
          density,
          style,
          tone,
          format: resolvedFormat,
          imageModel: imageModel ?? 'flux-schnell-fal',
          videoModel: videoModel ?? 'ltx-video-fal',
          videoQuality: videoQuality ?? '720p',
          textModel: textModel ?? 'gpt-4o-mini',
        } as const

        try {
          await clearStoryAssetsBeforeRegenerate(storyId, userId)
          await upsertStoryWithScenes({
            storyId,
            userId,
            category: category ?? 'stickman',
            storyInput: story,
            options: generateOptions,
            storyData: {
              title: 'Generating…',
              tagline: '',
              protagonist: '',
              thumbnailPrompt: '',
              thumbnailUrl: null,
              scenes: [],
            },
            status: 'generating',
          })
        } catch (persistErr) {
          console.error('Failed to persist story stub', persistErr)
        }

        const plan = await textProvider.planStory(story, density, style, tone, resolvedFormat, signal, {
          userId,
          storyId,
          operation: 'text_plan',
        })
        await throwIfAborted()

        // Never trust model-generated scene ids — some models emit duplicates ("S1","S1",…)
        // which collide on the scenes primary key. Reassign deterministic unique ids.
        plan.scenes = plan.scenes.map((s, i) => ({ ...s, id: `${storyId}-s${i + 1}` }))
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
          await upsertStoryWithScenes({
            storyId,
            userId,
            category: category ?? 'stickman',
            storyInput: story,
            options: generateOptions,
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
        let outOfCredits = false
        send({ type: 'image-progress', done, total })

        // Generate images concurrently (capped) with a per-image timeout so one hung
        // fal call can't stall the whole story. deductCredits is atomic, safe in parallel.
        await mapWithConcurrency(plan.scenes, IMAGE_CONCURRENCY, async (scene) => {
          if (signal.aborted || outOfCredits) return
          try {
            const { mimeType, data } = await withTimeout(
              imageProvider.generate(scene.imagePrompt, {
                aspectRatio: '16:9',
                signal,
                costContext: {
                  userId,
                  storyId,
                  sceneId: scene.id,
                  creditsCharged: creditsPerScene,
                  operation: 'scene_image',
                },
              }),
              IMAGE_TIMEOUT_MS,
              `Image for scene ${scene.id}`,
            )
            await throwIfAborted()

            const deduction = await deductCredits(userId, creditsPerScene)
            if (!deduction.ok) {
              outOfCredits = true
              send({ type: 'insufficient_credits', required: creditsPerScene, balance: deduction.balance })
              return
            }

            const imageUrl = await completeSceneImage({
              storyId,
              sceneId: scene.id,
              userId,
              data,
              mimeType,
            })

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
        })

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
            options: generateOptions,
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
          const userMsg = toUserErrorMessage(err, 'Generation failed')
          // Persist failure so the story doesn't stay stuck on "Generating…" after reload.
          try {
            await updateStoryMeta(storyId, userId, {
              status: 'failed',
              title: 'Generation failed',
              tagline: userMsg,
            })
          } catch (persistErr) {
            console.error('Failed to persist failed status', persistErr)
          }
          send({ type: 'error', error: userMsg })
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
