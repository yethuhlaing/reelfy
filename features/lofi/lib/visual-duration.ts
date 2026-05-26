import type { VisualMode } from '@/shared/lib/types'

export function calcVisualDuration(
  index: number,
  mode: VisualMode,
  total: number,
  targetDurationSec: number,
): number {
  if (mode === 'single-image' || mode === 'single-video') return targetDurationSec
  const perAsset = Math.floor(targetDurationSec / total)
  const remainder = targetDurationSec - perAsset * total
  return perAsset + (index === total - 1 ? remainder : 0)
}
