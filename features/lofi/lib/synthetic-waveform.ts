export function syntheticWaveform(seed: string, length = 100): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }

  return Array.from({ length }, (_, i) => {
    const x = i / length
    // Per-bar seeded PRNG — varied, non-repeating heights per track
    const s = ((h ^ (i * 374761393)) * 1664525 + 1013904223) | 0
    const r = (s >>> 0) / 0xffffffff

    // Spectral envelope: more energy at low/mid, taper at high freq
    const envelope = x < 0.5 ? 0.75 - x * 0.2 : Math.max(0.2, 0.85 - x * 0.85)

    return Math.min(0.97, Math.max(0.08, r * 0.6 + envelope * 0.35 + 0.05))
  })
}

export function sampleWaveformBars(waveform: number[], barCount = 64): number[] {
  if (waveform.length === 0) return new Array(barCount).fill(0.2)
  return Array.from({ length: barCount }, (_, i) => {
    const idx = Math.floor((i / barCount) * waveform.length)
    return waveform[idx] ?? 0
  })
}
