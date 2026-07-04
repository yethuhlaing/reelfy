import type { CSSProperties } from 'react'
import type { MemeBoxStyle, MemeRenderBox } from '@/shared/lib/types'

/**
 * Client-side style presets. MUST stay visually in sync with the server render
 * presets in features/meme/server/render.ts — this is the shared CSS contract
 * so the DOM preview matches the Satori export.
 */
const PRESETS: Record<
  MemeBoxStyle,
  { color: string; stroke: string | null; strokeWidthEm: number; uppercase: boolean; font: string }
> = {
  'impact-outline': { color: '#ffffff', stroke: '#000000', strokeWidthEm: 0.08, uppercase: true, font: 'Anton, Impact, sans-serif' },
  'plain-black': { color: '#000000', stroke: null, strokeWidthEm: 0, uppercase: false, font: 'Inter, sans-serif' },
  'plain-white': { color: '#ffffff', stroke: null, strokeWidthEm: 0, uppercase: false, font: 'Inter, sans-serif' },
  'label-white': { color: '#ffffff', stroke: '#000000', strokeWidthEm: 0.05, uppercase: false, font: 'Inter, sans-serif' },
}

/** Same auto-fit heuristic as the server, so preview font size ≈ export. */
export function fitFontSizePx(box: MemeRenderBox, boxWidthPx: number, boxHeightPx: number): number {
  if (box.fontSizePct) return (box.fontSizePct / 100) * boxHeightPx
  const text = box.text || ''
  const maxByHeight = boxHeightPx * 0.5
  const charCount = Math.max(text.length, 1)
  const maxByWidth = (boxWidthPx / (charCount * 0.55)) * (text.includes(' ') ? 2.2 : 1)
  return Math.max(14, Math.min(Math.min(maxByHeight, maxByWidth), boxHeightPx))
}

export function displayText(box: MemeRenderBox): string {
  const preset = PRESETS[box.style]
  return preset.uppercase || box.uppercase ? (box.text || '').toUpperCase() : box.text || ''
}

/** CSS for the inner text node of a box, given its resolved pixel dimensions. */
export function boxTextCss(box: MemeRenderBox, boxWidthPx: number, boxHeightPx: number): CSSProperties {
  const preset = PRESETS[box.style]
  const color = box.color ?? preset.color
  const stroke = box.strokeColor ?? preset.stroke
  const fontSize = fitFontSizePx(box, boxWidthPx, boxHeightPx)
  const strokePx = Math.max(1, fontSize * preset.strokeWidthEm)

  const css: CSSProperties = {
    color,
    fontFamily: box.fontFamily ?? preset.font,
    fontSize: `${fontSize}px`,
    lineHeight: 1.05,
    textAlign: box.align,
    width: '100%',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
  if (stroke) {
    css.textShadow = [
      `${strokePx}px 0 ${stroke}`,
      `-${strokePx}px 0 ${stroke}`,
      `0 ${strokePx}px ${stroke}`,
      `0 -${strokePx}px ${stroke}`,
      `${strokePx}px ${strokePx}px ${stroke}`,
      `-${strokePx}px -${strokePx}px ${stroke}`,
      `${strokePx}px -${strokePx}px ${stroke}`,
      `-${strokePx}px ${strokePx}px ${stroke}`,
    ].join(', ')
  }
  return css
}
