import { put } from '@vercel/blob'
import { getImageProvider } from '@/lib/providers/image'
import type { ImageModel } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function sanitizeText(s: string, max: number): string {
  return s.replace(/["\n\r]/g, ' ').trim().slice(0, max)
}

function buildPrompt(opts: {
  scenePrompt: string
  title?: string | null
  tagline?: string | null
}): string {
  const title = opts.title ? sanitizeText(opts.title, 60).toUpperCase() : null
  const tagline = opts.tagline ? sanitizeText(opts.tagline, 80) : null

  const titleLine = title
    ? `MAIN TITLE TEXT (must be visible, occupies top 30% of frame, hand-lettered marker style, 3-6 words MAX): "${title}".`
    : 'Bold hand-lettered title text fills top 30% of frame, 3-6 punchy words.'

  const taglineLine = tagline
    ? `Smaller subtitle text below title (smaller hand-written style): "${tagline}".`
    : ''

  return [
    'YouTube clickbait thumbnail, 16:9, hand-drawn stickman cartoon style.',
    'STYLE: thick black ink outlines, flat vivid colors (no gradients, no photorealism, no shading), bold saturated background — pick ONE of: bright orange, electric yellow, hot pink, cyan, or red. Never white background.',
    'COMPOSITION: stickman character fills 50–70% of frame, exaggerated dramatic pose, oversized expressive face (huge eyes, open mouth, eyebrows up). Single dominant FX element: sunburst, motion lines, arrow, sparkle, or explosion shape behind subject.',
    titleLine,
    taglineLine,
    'TEXT RULES: text is HUGE, readable when scaled to 320×180 px, high contrast (black text on light bg OR white text with thick black outline), no script fonts, no thin strokes, no lorem ipsum. Spell every word correctly.',
    'EXTRAS: optional small red circle/arrow highlight pointing at face. No watermarks, no logos, no borders, full bleed to edges.',
    `SCENE: ${opts.scenePrompt}`,
  ]
    .filter(Boolean)
    .join(' ')
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return badRequest('Invalid JSON')
  }

  const { storyId, prompt, title, tagline, imageModel } = body as {
    storyId?: string
    prompt?: string
    title?: string | null
    tagline?: string | null
    imageModel?: ImageModel
  }

  if (!storyId || !prompt) {
    return badRequest('Missing required fields: storyId, prompt')
  }

  const imageProvider = getImageProvider(imageModel)
  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }

  try {
    const fullPrompt = buildPrompt({ scenePrompt: prompt, title, tagline })
    const { mimeType, data } = await imageProvider.generate(fullPrompt, { aspectRatio: '16:9' })
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN

    let url: string
    if (hasBlobToken) {
      const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
      const blob = await put(`thumbnails/${storyId}.${ext}`, data, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      url = `${blob.url}?v=${Date.now()}`
    } else {
      url = `data:${mimeType};base64,${data.toString('base64')}`
    }

    return Response.json({ url })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Thumbnail generation failed' }),
      { status: 500 }
    )
  }
}