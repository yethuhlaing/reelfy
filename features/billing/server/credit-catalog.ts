/**
 * CENTRAL CREDIT CATALOG — single source of truth for credit pricing.
 *
 * Credits are derived from real per-operation COGS (cost of goods sold, i.e. what
 * we pay the upstream provider in USD). Never hardcode a credit number for a paid
 * operation anywhere else — add its `costUsd` here and let `creditsForCost()`
 * derive the charge. This keeps margin consistent no matter which feature a user
 * spends on.
 *
 * ── The model ────────────────────────────────────────────────────────────────
 *   credits(costUsd) = ceil( costUsd * TARGET_MARGIN / CREDIT_SELL_USD )
 *
 *   CREDIT_SELL_USD  what one credit sells for (we anchor to the top-up pack rate,
 *                    $20 / 500cr = $0.04). Subscription credits sell cheaper per
 *                    credit, so pricing against the pack rate leaves subscription
 *                    users with extra margin cushion — safe by construction.
 *   TARGET_MARGIN    COGS multiple we want to clear. Tune this ONE number to move
 *                    the whole catalog's margin.
 *
 * Some "finish"/export actions (lofi render, brainrot export) are intentionally
 * subsidized below TARGET_MARGIN via `MARGIN_OVERRIDE` — they're the last step of
 * a paid funnel, so keeping them cheap protects conversion. Margin is recovered
 * on the generation ops that precede them.
 */

/** What one credit sells for in USD (top-up pack rate: $20 / 500cr). */
export const CREDIT_SELL_USD = 0.04

/** Target margin as a multiple of COGS. Tune to reprice the entire catalog. */
export const TARGET_MARGIN = 3.5

export const MARGIN_OVERRIDE: Partial<Record<OperationKey, number>> = {
  lofi_render: 1.5, // export/finish action — keep cheap, recover on generation
  brainrot_export: 1.5, // export/finish action — see brainrot buckets below
}

export function creditsForCost(costUsd: number, margin: number = TARGET_MARGIN): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0
  return Math.max(1, Math.ceil((costUsd * margin) / CREDIT_SELL_USD))
}

/** Resolve the margin for a named operation (override or default). */
export function marginForOperation(op: OperationKey): number {
  return MARGIN_OVERRIDE[op] ?? TARGET_MARGIN
}

/** Credits for a named operation, using its override margin if present. */
export function creditsForOperation(op: OperationKey, costUsd: number): number {
  return creditsForCost(costUsd, marginForOperation(op))
}

// ── Operation COGS registry ──────────────────────────────────────────────────
// Real upstream USD cost per operation. Derived credit numbers are computed, not
// stored, so they can never drift from cost.

export type OperationKey =
  | 'meme_generation'
  | 'meme_clean_download'
  | 'brainrot_write'
  | 'brainrot_export'
  | 'lofi_render'

/** Rate cards for provider costs used to build op COGS. */
export const RATES = {
  /** ElevenLabs eleven_flash_v2_5 — USD per character of script. */
  elevenLabsPerChar: 0.0003,
  /** fal auto-subtitle — USD per export (varies $0.03–0.06; use upper bound). */
  falSubtitlePerExport: 0.06,
  /** fal ffmpeg compose — USD per export (small, fixed-ish). */
  falComposePerExport: 0.01,
  /** Text model (script write) — USD per generation, rough upper bound. */
  textWritePerGen: 0.002,
  /** Meme image generation (flux-schnell class) — USD per image. */
  memeImagePerGen: 0.003,
} as const

// ── Simple, fixed-cost ops ───────────────────────────────────────────────────

export const MEME_GENERATION_COST_USD = RATES.memeImagePerGen
export const MEME_CLEAN_DOWNLOAD_COST_USD = RATES.memeImagePerGen
export const BRAINROT_WRITE_COST_USD = RATES.textWritePerGen

export const MEME_GENERATION_CREDITS = creditsForOperation('meme_generation', MEME_GENERATION_COST_USD)
export const MEME_CLEAN_DOWNLOAD_CREDITS = creditsForOperation('meme_clean_download', MEME_CLEAN_DOWNLOAD_COST_USD)
export const BRAINROT_WRITE_CREDITS = creditsForOperation('brainrot_write', BRAINROT_WRITE_COST_USD)

// ── Brainrot export: variable COGS, bucketed by script length ────────────────
// COGS is dominated by ElevenLabs (per-char). To keep the UX simple — one clear
// number shown before export, no per-video math — we bucket by word count and
// price each bucket off its worst-case COGS at the (subsidized) export margin.

export interface BrainrotBucket {
  /** Inclusive upper word bound for this bucket (Infinity for the top bucket). */
  maxWords: number
  label: string
  /** Worst-case COGS for this bucket, used to derive the credit charge. */
  worstCaseCostUsd: number
  credits: number
}

const AVG_CHARS_PER_WORD = 5.5

function brainrotBucketCost(maxWords: number): number {
  const chars = maxWords * AVG_CHARS_PER_WORD
  return (
    chars * RATES.elevenLabsPerChar +
    RATES.falSubtitlePerExport +
    RATES.falComposePerExport
  )
}

function buildBrainrotBucket(maxWords: number, label: string): BrainrotBucket {
  // For the open-ended top bucket, price against the script word cap (300).
  const costWords = Number.isFinite(maxWords) ? maxWords : 300
  const worstCaseCostUsd = brainrotBucketCost(costWords)
  return {
    maxWords,
    label,
    worstCaseCostUsd,
    credits: creditsForOperation('brainrot_export', worstCaseCostUsd),
  }
}

export const BRAINROT_EXPORT_BUCKETS: BrainrotBucket[] = [
  buildBrainrotBucket(100, 'Short (<100 words)'),
  buildBrainrotBucket(200, 'Medium (100–200 words)'),
  buildBrainrotBucket(Infinity, 'Long (200+ words)'),
]

/** Bucket a script falls into, by word count. */
export function brainrotBucketForWords(wordCount: number): BrainrotBucket {
  return (
    BRAINROT_EXPORT_BUCKETS.find((b) => wordCount <= b.maxWords) ??
    BRAINROT_EXPORT_BUCKETS[BRAINROT_EXPORT_BUCKETS.length - 1]
  )
}

/** Credits to charge for a brainrot export of a given word count. */
export function brainrotExportCredits(wordCount: number): number {
  return brainrotBucketForWords(wordCount).credits
}

/** Cheapest export bucket cost — for "from N credits" display copy. */
export const BRAINROT_EXPORT_MIN_CREDITS = BRAINROT_EXPORT_BUCKETS[0].credits

// ── Lofi visual/music/render COGS ────────────────────────────────────────────
// Kept in the same { credits, costUsd } shape the lofi feature already consumes,
// but credits are now DERIVED from costUsd so they can't drift.

function visual(costUsd: number): { credits: number; costUsd: number } {
  return { credits: creditsForCost(costUsd), costUsd }
}

/** Per-model visual generation COGS. Add a model here to price it everywhere. */
export const VISUAL_COST_USD: Record<string, number> = {
  'flux-schnell-fal': 0.003,
  'flux-dev-fal': 0.05,
  'gemini-2.5-flash-image': 0.01,
  'sdxl-lightning-fal': 0.003,
  'ltx-video-fal': 0.1,
  'longcat-fal': 0.2,
  'kling-fal': 0.5,
}

export const VISUAL_PRICING: Record<string, { credits: number; costUsd: number }> = Object.fromEntries(
  Object.entries(VISUAL_COST_USD).map(([model, costUsd]) => [model, visual(costUsd)]),
)

/** Per-loop music generation COGS. */
export const MUSIC_COST_PER_LOOP_USD: Record<string, number> = {
  minimax: 0.1,
  'stable-audio': 0.05,
  cassette: 0.01,
  freetouse: 0,
}

export const MUSIC_PRICING: Record<string, { creditsPerLoop: number; costPerLoopUsd: number }> =
  Object.fromEntries(
    Object.entries(MUSIC_COST_PER_LOOP_USD).map(([model, costPerLoopUsd]) => [
      model,
      { creditsPerLoop: creditsForCost(costPerLoopUsd), costPerLoopUsd },
    ]),
  )

/** Lofi final render COGS (fal compose of a full stock video). Subsidized op. */
export const RENDER_COST_USD = 0.5
export const RENDER_CREDITS = creditsForOperation('lofi_render', RENDER_COST_USD)
