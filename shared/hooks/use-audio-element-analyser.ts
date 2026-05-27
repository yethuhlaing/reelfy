'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

const audioGraph = {
  element: null as HTMLAudioElement | null,
  context: null as AudioContext | null,
  analyser: null as AnalyserNode | null,
}

function getAnalyserForElement(audio: HTMLAudioElement): AnalyserNode | null {
  if (audioGraph.element === audio && audioGraph.analyser) {
    return audioGraph.analyser
  }

  try {
    if (audioGraph.context) {
      void audioGraph.context.close()
    }

    const context = new AudioContext()
    const source = context.createMediaElementSource(audio)
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.8
    source.connect(analyser)
    analyser.connect(context.destination)

    audioGraph.element = audio
    audioGraph.context = context
    audioGraph.analyser = analyser
    return analyser
  } catch {
    return null
  }
}

export function useAudioElementAnalyser(
  audioRef: RefObject<HTMLAudioElement | null>,
  enabled: boolean,
  barCount = 24,
): number[] | null {
  const [bands, setBands] = useState<number[] | null>(null)
  const barCountRef = useRef(barCount)
  barCountRef.current = barCount

  useEffect(() => {
    if (!enabled || !audioRef.current) {
      setBands(null)
      return
    }

    const audio = audioRef.current
    const analyser = getAnalyserForElement(audio)
    if (!analyser || !audioGraph.context) {
      setBands(null)
      return
    }

    if (audioGraph.context.state === 'suspended') {
      void audioGraph.context.resume()
    }

    const bufferLength = analyser.frequencyBinCount
    const data = new Uint8Array(bufferLength)
    const ctx = audioGraph.context
    let frameId = 0

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const count = barCountRef.current
      const next = new Array<number>(count)

      // Log-scale frequency mapping so each bar covers an exponentially
      // wider slice — matches human pitch perception, eliminates the
      // "bass tall / treble flat" staircase from linear chunking.
      const nyquist = ctx.sampleRate / 2
      const minFreq = 40
      const maxFreq = 16000
      const freqPerBin = nyquist / bufferLength

      for (let i = 0; i < count; i++) {
        const f1 = minFreq * Math.pow(maxFreq / minFreq, i / count)
        const f2 = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / count)
        const b1 = Math.max(0, Math.floor(f1 / freqPerBin))
        const b2 = Math.min(bufferLength - 1, Math.ceil(f2 / freqPerBin))
        const binCount = Math.max(1, b2 - b1)

        let sum = 0
        for (let j = b1; j < b1 + binCount; j++) sum += data[j] ?? 0
        next[i] = (sum / binCount) / 255
      }

      setBands(next)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
      setBands(null)
    }
  }, [audioRef, enabled])

  return bands
}

export function useAnimatedWaveformBands(enabled: boolean, barCount = 24): number[] {
  const [bands, setBands] = useState(() => new Array(barCount).fill(0.2))

  useEffect(() => {
    if (!enabled) {
      setBands(new Array(barCount).fill(0.2))
      return
    }

    const start = performance.now()
    let frameId = 0

    const tick = (now: number) => {
      const t = (now - start) / 1000
      setBands(
        Array.from({ length: barCount }, (_, i) => {
          const norm = i / (barCount - 1)

          // Spectral envelope: bass/low-mid prominent, high freq tapers
          const envelope =
            norm < 0.08
              ? 0.52
              : norm < 0.35
                ? 0.72 - norm * 0.3
                : Math.max(0.14, 0.82 - norm * 0.85)

          // Independent per-bar oscillators with golden-ratio phase spacing
          const p = i * 2.618
          const osc =
            Math.sin(t * (1.9 + norm * 3.7) + p) * 0.18 +
            Math.sin(t * (4.1 + i * 0.23) + p * 0.6) * 0.09

          // Simulated kick-drum pulse (~120 bpm) pumps the bass bars
          const kick =
            i < barCount * 0.18 ? Math.max(0, Math.sin(t * Math.PI * 2) ** 2) * 0.22 : 0

          return Math.max(0.06, Math.min(0.96, envelope + osc + kick + (Math.random() - 0.5) * 0.05))
        }),
      )
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [enabled, barCount])

  return bands
}
