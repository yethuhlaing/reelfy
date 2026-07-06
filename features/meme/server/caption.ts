import { env } from '@/shared/lib/env'
import type { MemeTemplate, MemeBoxCaption } from '@/shared/lib/types'
import { CAPTION_MODEL, type CaptionModel } from '@/features/meme/server/caption-models'

export {
  CAPTION_MODEL,
  CAPTION_MODEL_OPTIONS,
  resolveCaptionModel,
  type CaptionModel,
} from '@/features/meme/server/caption-models'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Strip markdown fences some models wrap around JSON. */
function stripFences(content: string): string {
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenceMatch ? fenceMatch[1] : content
}

function buildSystemPrompt(): string {
  return [
    'You are a viral meme caption writer.',
    'Given a user idea and a specific meme template, write the caption text for each text box.',
    'Match the template\'s joke structure exactly. Each box has a role; the caption for that box must fit its role.',
    'Keep captions punchy and within the character limit for each box. Do not exceed maxChars.',
    'Return ONLY JSON: {"boxes":[{"index":0,"text":"..."},...]} with exactly one entry per box, indices in order.',
    'Do not include any commentary. Do not add or remove boxes.',
  ].join(' ')
}

function buildUserPrompt(idea: string, template: MemeTemplate): string {
  const boxLines = template.textBoxes
    .map((b) => {
      const role = template.boxRoles[b.index] ?? 'caption'
      return `  - box ${b.index}: role="${role}", maxChars=${b.maxChars}`
    })
    .join('\n')

  const examples =
    template.examples.length > 0
      ? '\nExample fills for this template:\n' +
        template.examples
          .map((ex, i) => `  ${i + 1}. ${ex.map((t, bi) => `[box ${bi}] ${t}`).join(' | ')}`)
          .join('\n')
      : ''

  return [
    `User idea: "${idea}"`,
    ``,
    `Template: ${template.name}`,
    `What it means: ${template.description}`,
    template.captionGuide ? `Joke structure: ${template.captionGuide}` : '',
    ``,
    `Boxes (${template.textBoxes.length} total):`,
    boxLines,
    examples,
    ``,
    `Write the caption for each box now.`,
  ]
    .filter(Boolean)
    .join('\n')
}

interface CaptionResponse {
  boxes: MemeBoxCaption[]
}

async function callCaption(
  idea: string,
  template: MemeTemplate,
  model: CaptionModel,
  signal?: AbortSignal,
): Promise<MemeBoxCaption[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'X-Title': 'Reelify',
  }
  if (env.PUBLIC_BASE_URL) headers['HTTP-Referer'] = env.PUBLIC_BASE_URL

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(idea, template) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 512,
    }),
    signal,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter caption error (${res.status}): ${err}`)
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  const parsed = JSON.parse(stripFences(data.choices[0].message.content)) as CaptionResponse
  return parsed.boxes ?? []
}

/** True when the caption set has exactly one non-empty entry per template box. */
function isValidCaptionSet(boxes: MemeBoxCaption[], template: MemeTemplate): boolean {
  if (boxes.length !== template.textBoxes.length) return false
  const indices = new Set(boxes.map((b) => b.index))
  return template.textBoxes.every(
    (b) => indices.has(b.index) && typeof boxes.find((c) => c.index === b.index)?.text === 'string',
  )
}

/** Clamp each caption to its box's maxChars as a hard safety net. */
function clampCaptions(boxes: MemeBoxCaption[], template: MemeTemplate): MemeBoxCaption[] {
  return template.textBoxes.map((box) => {
    const cap = boxes.find((c) => c.index === box.index)
    const text = (cap?.text ?? '').trim().slice(0, box.maxChars)
    return { index: box.index, text }
  })
}

/**
 * Write captions for one template, validating box count and retrying once on
 * a structural mismatch. Returns captions aligned/clamped to the template.
 */
export async function generateCaptions(
  idea: string,
  template: MemeTemplate,
  model: CaptionModel = CAPTION_MODEL,
  signal?: AbortSignal,
): Promise<MemeBoxCaption[]> {
  let boxes = await callCaption(idea, template, model, signal)
  if (!isValidCaptionSet(boxes, template)) {
    boxes = await callCaption(idea, template, model, signal)
  }
  return clampCaptions(boxes, template)
}
