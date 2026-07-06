/** Free tier carries a logo watermark on generation; paid tiers do not. */
export function shouldWatermarkForPlan(planTier: string): boolean {
  return planTier === 'free'
}
