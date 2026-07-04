/** Watermark text applied to rendered memes, gated by plan tier. */
const WATERMARK_TEXT = 'reelfy.me'

/** Free tier carries a watermark; paid tiers do not. */
export function watermarkForPlan(planTier: string): string | undefined {
  return planTier === 'free' ? WATERMARK_TEXT : undefined
}
