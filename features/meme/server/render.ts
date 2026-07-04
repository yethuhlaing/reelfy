import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import type { MemeBoxStyle, MemeRenderBox } from '@/shared/lib/types'
import { loadMemeFonts, fontFamilyForStyle } from './fonts'

/** Visual constants shared with the client preview (keep these in sync). */
const STYLE_PRESETS: Record<
  MemeBoxStyle,
  { color: string; stroke: string | null; strokeWidthEm: number; uppercase: boolean; fontWeight: 400 | 700 }
> = {
  'impact-outline': { color: '#ffffff', stroke: '#000000', strokeWidthEm: 0.08, uppercase: true, fontWeight: 400 },
  'plain-black': { color: '#000000', stroke: null, strokeWidthEm: 0, uppercase: false, fontWeight: 700 },
  'plain-white': { color: '#ffffff', stroke: null, strokeWidthEm: 0, uppercase: false, fontWeight: 700 },
  'label-white': { color: '#ffffff', stroke: '#000000', strokeWidthEm: 0.05, uppercase: false, fontWeight: 700 },
}

/**
 * Auto-fit font size (in px) for a box. Estimates the largest size where the
 * text fits both the box width (via char-width heuristic) and height. Satori
 * wraps text, so this errs conservative and the box also clips overflow.
 */
function fitFontSize(box: MemeRenderBox, boxWidthPx: number, boxHeightPx: number): number {
  if (box.fontSizePct) return (box.fontSizePct / 100) * boxHeightPx
  const text = box.text || ''
  // Start from a size proportional to box height, shrink until width fits.
  const maxByHeight = boxHeightPx * 0.5
  const charCount = Math.max(text.length, 1)
  // Avg glyph advance ~0.55em for condensed fonts.
  const maxByWidth = (boxWidthPx / (charCount * 0.55)) * (text.includes(' ') ? 2.2 : 1)
  const size = Math.min(maxByHeight, maxByWidth)
  return Math.max(14, Math.min(size, boxHeightPx))
}

// Minimal element type Satori accepts (React-element-shaped plain objects).
type El = { type: string; props: Record<string, unknown> }
function el(type: string, props: Record<string, unknown>, children?: unknown): El {
  return { type, props: { ...props, children } }
}

function boxElement(box: MemeRenderBox): El {
  const preset = STYLE_PRESETS[box.style]
  const color = box.color ?? preset.color
  const stroke = box.strokeColor ?? preset.stroke
  const text = preset.uppercase || box.uppercase ? (box.text || '').toUpperCase() : box.text || ''
  const fontFamily = box.fontFamily ?? fontFamilyForStyle(box.style)

  const justify =
    box.align === 'left' ? 'flex-start' : box.align === 'right' ? 'flex-end' : 'center'

  const textStyle: Record<string, unknown> = {
    color,
    fontFamily,
    fontWeight: preset.fontWeight,
    fontSize: 100, // placeholder; overwritten per-render below via wrapper var
    lineHeight: 1.05,
    textAlign: box.align,
    display: 'flex',
    whiteSpace: 'pre-wrap',
  }
  if (stroke) {
    // Satori supports textShadow-based outline; layer 4 offsets for a stroke look.
    const w = 'STROKE_PX'
    textStyle.textShadow = [
      `${w} 0 ${stroke}`,
      `-${w} 0 ${stroke}`,
      `0 ${w} ${stroke}`,
      `0 -${w} ${stroke}`,
      `${w} ${w} ${stroke}`,
      `-${w} -${w} ${stroke}`,
      `${w} -${w} ${stroke}`,
      `-${w} ${w} ${stroke}`,
    ].join(', ')
  }

  return el(
    'div',
    {
      style: {
        position: 'absolute',
        left: `${box.xPct}%`,
        top: `${box.yPct}%`,
        width: `${box.wPct}%`,
        height: `${box.hPct}%`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        overflow: 'hidden',
        // font sizing is injected as a data marker resolved per box before render
        ['data-box-index' as string]: box.index,
      },
    },
    el('div', { style: textStyle }, text),
  )
}

/**
 * Render all caption boxes into a single transparent overlay PNG sized to the
 * template, then composite onto the template image with sharp.
 *
 * Returns a PNG Buffer of the finished meme.
 */
export async function renderMeme(params: {
  templateImage: Buffer
  width: number
  height: number
  boxes: MemeRenderBox[]
  watermark?: string
}): Promise<Buffer> {
  const { templateImage, width, height, boxes, watermark } = params
  const fonts = await loadMemeFonts()

  const children = boxes.map((box) => {
    // Resolve per-box font size + stroke width now that we know pixel dims.
    const boxWidthPx = (box.wPct / 100) * width
    const boxHeightPx = (box.hPct / 100) * height
    const fontSize = fitFontSize(box, boxWidthPx, boxHeightPx)
    const strokePx = Math.max(1, fontSize * (STYLE_PRESETS[box.style].strokeWidthEm || 0))

    const node = boxElement(box)
    // Inject resolved fontSize + stroke width into the inner text node.
    const inner = (node.props.children as El)
    ;(inner.props.style as Record<string, unknown>).fontSize = fontSize
    const ts = (inner.props.style as Record<string, unknown>).textShadow
    if (typeof ts === 'string') {
      ;(inner.props.style as Record<string, unknown>).textShadow = ts.replaceAll(
        'STROKE_PX',
        `${strokePx.toFixed(1)}px`,
      )
    }
    return node
  })

  if (watermark) {
    children.push(
      el(
        'div',
        {
          style: {
            position: 'absolute',
            right: '1.5%',
            bottom: '1.5%',
            display: 'flex',
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: Math.round(height * 0.028),
            textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
          },
        },
        watermark,
      ),
    )
  }

  const root = el(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
      },
    },
    children,
  )

  const svg = await satori(root as unknown as React.ReactNode, {
    width,
    height,
    fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: f.style })),
  })

  const overlayPng = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng()

  const output = await sharp(templateImage)
    .resize(width, height, { fit: 'fill' })
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .png()
    .toBuffer()

  return output
}
