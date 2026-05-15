import { planStory } from '@/lib/gemini'
import { put } from '@vercel/blob'
import type { SceneDensity, StickStyle, VoiceTone, StreamEvent, Scene } from '@/lib/types'
import { getImageProvider } from '@/lib/providers/image'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }
  const { story, density, style, tone } = body as {
    story: string
    density: SceneDensity
    style: StickStyle
    tone: VoiceTone
  }

  if (!story || !density || !style || !tone) {
    return new Response(JSON.stringify({ error: 'Missing required fields: story, density, style, tone' }), { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), { status: 500 })
  }

  const imageProvider = getImageProvider()
  if (!imageProvider.id.startsWith('nano-banana') && !process.env.FAL_KEY) {
    return new Response(JSON.stringify({ error: 'FAL_KEY is not configured' }), { status: 500 })
  }

  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`))
      }

      try {
        send({ type: 'stage', id: 'analyze', status: 'active', detail: 'Reading your story' })
        send({ type: 'stage', id: 'plan', status: 'pending' })
        send({ type: 'stage', id: 'images', status: 'pending' })

        send({ type: 'stage', id: 'analyze', status: 'done' })
        send({ type: 'stage', id: 'plan', status: 'active', detail: 'Planning scenes with Gemini' })

        const plan = await planStory(story, density, style, tone)
        send({ type: 'story', title: plan.title, tagline: plan.tagline })

        for (const p of plan.scenes) {
          const scene: Scene = { ...p, imageUrl: null, voiceoverUrl: null }
          send({ type: 'scene-planned', scene })
        }

        send({ type: 'stage', id: 'plan', status: 'done', detail: `${plan.scenes.length} scenes` })
        send({ type: 'info', message: `Using image provider: ${imageProvider.id}` })
        send({
          type: 'stage',
          id: 'images',
          status: 'active',
          detail: `Generating ${plan.scenes.length} images (${imageProvider.id})`,
        })

        let done = 0
        const total = plan.scenes.length
        send({ type: 'image-progress', done, total })

        await Promise.all(
          plan.scenes.map(async (scene) => {
            try {
              const { mimeType, data } = await imageProvider.generate(scene.imagePrompt, { aspectRatio: '16:9' })
              let imageUrl: string
              if (hasBlobToken) {
                const ext = mimeType.split('/')[1] || 'png'
                const blob = await put(`scenes/${Date.now()}-${scene.id}.${ext}`, data, {
                  access: 'public',
                  contentType: mimeType,
                  addRandomSuffix: true,
                })
                imageUrl = blob.url
              } else {
                imageUrl = `data:${mimeType};base64,${data.toString('base64')}`
              }
              send({ type: 'scene-image', sceneId: scene.id, imageUrl })
            } catch (err) {
              send({
                type: 'scene-image-error',
                sceneId: scene.id,
                error: err instanceof Error ? err.message : 'Image generation failed',
              })
            } finally {
              done += 1
              send({ type: 'image-progress', done, total })
            }
          })
        )

        send({ type: 'stage', id: 'images', status: 'done', detail: `${done}/${total} images` })
        send({ type: 'stage', id: 'done', status: 'done' })
        send({ type: 'complete' })
      } catch (err) {
        console.error('Generate stream error:', err)
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Generation failed',
        })
      } finally {
        controller.close()
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
