// Meme generator pipeline types.
//
// Placement is percent-based (0..100) relative to template dimensions so a
// template can be re-hosted at any resolution without re-annotating boxes.
// Style is a named preset the renderer + editor both understand, so the DOM
// preview (CSS) and the server render (Satori) stay in visual sync.

/** Named caption style preset. Drives both the CSS preview and the Satori render. */
export type MemeBoxStyle =
  | 'impact-outline' // classic white Impact + black stroke (top/bottom captions)
  | 'plain-black' // black text, no stroke (Drake right-panel style)
  | 'plain-white' // white text, no stroke
  | 'label-white' // small white label placed over a subject

export type MemeBoxAlign = 'left' | 'center' | 'right'

/**
 * A caption slot defined on a template. Geometry is percent-of-template.
 * `maxChars` caps the LLM caption so it fits; the renderer also auto-fits the
 * font down to guarantee no overflow.
 */
export interface MemeTextBox {
  index: number
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  align: MemeBoxAlign
  style: MemeBoxStyle
  maxChars: number
  /** Optional upper-case forcing (classic meme look). Defaults per style. */
  uppercase?: boolean
}

export type MemeTemplateSource = 'imgflip' | 'owned' | 'generated'

/** A curated template row (as returned to the client; embedding omitted). */
export interface MemeTemplate {
  id: string
  slug: string
  name: string
  imageUrl: string
  width: number
  height: number
  description: string
  captionGuide: string
  textBoxes: MemeTextBox[]
  boxRoles: string[]
  examples: string[][]
  toneTags: string[]
  trendingScore: number
  source: MemeTemplateSource
}

/** One caption filled into a box by the LLM (or edited by the user). */
export interface MemeBoxCaption {
  index: number
  text: string
}

/**
 * A fully-resolved box ready to render: geometry + style (from the template)
 * merged with the caption text. This is the export contract shared by the DOM
 * preview and the Satori server render.
 */
export interface MemeRenderBox extends MemeTextBox {
  text: string
  /** Optional per-box overrides set in the editor. */
  color?: string
  strokeColor?: string
  fontFamily?: string
  fontSizePct?: number
}

/** One AI-generated candidate before the user picks. */
export interface MemeVariant {
  templateId: string
  templateName: string
  imageUrl: string
  width: number
  height: number
  boxes: MemeRenderBox[]
  /** Rendered preview PNG (Blob URL). */
  renderedUrl: string
}

/** Response of POST /api/meme/generate. */
export interface MemeGenResult {
  generationId: string
  variants: MemeVariant[]
  creditsCharged: number
  balance: number
}

/** A saved generation (prompt + all variants). */
export interface MemeGeneration {
  id: string
  inputText: string
  variants: MemeVariant[]
  createdAt: string
}

/** @deprecated Legacy single-meme record. Use MemeGeneration instead. */
export interface SavedMeme {
  id: string
  inputText: string
  templateId: string
  boxes: MemeRenderBox[]
  imageUrl: string
  width: number
  height: number
  createdAt: string
}
