function sanitizeText(input: string, max: number): string {
  return input.replace(/["\n\r]/g, ' ').trim().slice(0, max)
}

export interface StickmanThumbnailInput {
  scenePrompt: string
  title?: string | null
  tagline?: string | null
}

export function stickmanThumbnailSystemPrompt(): string {
  return [
    'YouTube clickbait thumbnail, 16:9, hand-drawn stickman cartoon style.',
    'STYLE: thick black ink outlines, flat vivid colors (no gradients, no photorealism, no shading), bold saturated background — pick ONE of: bright orange, electric yellow, hot pink, cyan, or red. Never white background.',
    'COMPOSITION: stickman character fills 50–70% of frame, exaggerated dramatic pose, oversized expressive face (huge eyes, open mouth, eyebrows up). Single dominant FX element: sunburst, motion lines, arrow, sparkle, or explosion shape behind subject.',
    'TEXT RULES: text is HUGE, readable when scaled to 320×180 px, high contrast (black text on light bg OR white text with thick black outline), no script fonts, no thin strokes, no lorem ipsum. Spell every word correctly.',
    'EXTRAS: optional small red circle/arrow highlight pointing at face. No watermarks, no logos, no borders, full bleed to edges.',
  ].join(' ')
}

export function stickmanThumbnailUserMessage(opts: StickmanThumbnailInput): string {
  const title = opts.title ? sanitizeText(opts.title, 60).toUpperCase() : null
  const tagline = opts.tagline ? sanitizeText(opts.tagline, 80) : null

  const titleLine = title
    ? `MAIN TITLE TEXT (must be visible, occupies top 30% of frame, hand-lettered marker style, 3-6 words MAX): "${title}".`
    : 'Bold hand-lettered title text fills top 30% of frame, 3-6 punchy words.'

  const taglineLine = tagline
    ? `Smaller subtitle text below title (smaller hand-written style): "${tagline}".`
    : ''

  return [titleLine, taglineLine, `SCENE: ${opts.scenePrompt}`].filter(Boolean).join(' ')
}

export function stickmanThumbnailRequest(opts: StickmanThumbnailInput): string {
  return `${stickmanThumbnailSystemPrompt()} ${stickmanThumbnailUserMessage(opts)}`
}
