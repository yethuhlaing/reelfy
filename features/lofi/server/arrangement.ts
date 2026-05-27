import type { VisualMode } from '@/shared/lib/types'

const MUSIC_CROSSFADE_SEC = 12
const VISUAL_CROSSFADE_SEC = 2
const BED_GAIN_DB = -18

export type ArrangementPlan = {
  totalDurationSec: number
  music: {
    bed: { url: string; gainDb: number } | null
    blocks: Array<{
      loopUrl: string
      loopLengthSec: number
      startSec: number
      durationSec: number
      repeats: number
      crossfadeInSec: number
    }>
  }
  visual: {
    mode: VisualMode
    clips: Array<{
      assetUrl: string
      startSec: number
      durationSec: number
      crossfadeInSec: number
    }>
  }
}

export interface FalKeyframe {
  timestamp: number
  duration: number
  url: string
}

export interface FalTrack {
  id: string
  type: 'audio' | 'video' | 'image'
  keyframes: FalKeyframe[]
}

export interface ReadyMusicAsset {
  url: string
  lengthSec: number
  orderIndex: number
}

export interface ReadyVisualAsset {
  url: string
  durationSec: number
  orderIndex: number
}

export interface BuildPlanInput {
  targetDurationSec: number
  videoId: string
  musicLoops: ReadyMusicAsset[]
  visualAssets: ReadyVisualAsset[]
  visualMode: VisualMode
  ambientBedUrl: string | null
}

function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    return hash / 0x7fffffff
  }
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function shuffleStable<T>(arr: T[], seed: string): T[] {
  const rng = seededRandom(seed)
  const indexed = arr.map((item, i) => ({ item, key: rng() + i * 1e-10 }))
  indexed.sort((a, b) => a.key - b.key)
  return indexed.map(({ item }) => item)
}

export function buildArrangementPlan(input: BuildPlanInput): ArrangementPlan {
  const { targetDurationSec, videoId, musicLoops, visualAssets, visualMode, ambientBedUrl } = input

  const shuffled = shuffleStable(musicLoops, videoId)
  const rng = seededRandom(videoId)

  const blocks: ArrangementPlan['music']['blocks'] = []
  let cursor = 0
  let i = 0

  while (cursor < targetDurationSec) {
    const loop = shuffled[i % shuffled.length]
    const repeats = randomInt(2, 3, rng)
    const blockDur = loop.lengthSec * repeats

    blocks.push({
      loopUrl: loop.url,
      loopLengthSec: loop.lengthSec,
      startSec: Math.max(0, i > 0 ? cursor - MUSIC_CROSSFADE_SEC : 0),
      durationSec: blockDur,
      repeats,
      crossfadeInSec: i > 0 ? MUSIC_CROSSFADE_SEC : 0,
    })

    cursor += blockDur - MUSIC_CROSSFADE_SEC
    i++
  }

  if (blocks.length > 0) {
    const last = blocks[blocks.length - 1]
    const lastEnd = last.startSec + last.durationSec
    const overshoot = lastEnd - targetDurationSec
    if (overshoot > 0) {
      last.durationSec = Math.max(last.durationSec - overshoot, 1)
    }
  }

  const clips: ArrangementPlan['visual']['clips'] = []
  let vCursor = 0

  if (visualMode === 'single-image' || visualMode === 'single-video') {
    const asset = visualAssets[0]
    if (asset) {
      clips.push({
        assetUrl: asset.url,
        startSec: 0,
        durationSec: targetDurationSec,
        crossfadeInSec: 0,
      })
    }
  } else {
    for (let vi = 0; vi < visualAssets.length; vi++) {
      const asset = visualAssets[vi]
      const startSec = vi > 0 ? vCursor - VISUAL_CROSSFADE_SEC : 0
      clips.push({
        assetUrl: asset.url,
        startSec: Math.max(0, startSec),
        durationSec: asset.durationSec,
        crossfadeInSec: vi > 0 ? VISUAL_CROSSFADE_SEC : 0,
      })
      vCursor += asset.durationSec - VISUAL_CROSSFADE_SEC
    }

    if (clips.length > 0) {
      const lastClip = clips[clips.length - 1]
      const lastClipEnd = lastClip.startSec + lastClip.durationSec
      const overshoot = lastClipEnd - targetDurationSec
      if (overshoot > 0) {
        lastClip.durationSec = Math.max(lastClip.durationSec - overshoot, 1)
      }
    }
  }

  return {
    totalDurationSec: targetDurationSec,
    music: {
      bed: ambientBedUrl ? { url: ambientBedUrl, gainDb: BED_GAIN_DB } : null,
      blocks,
    },
    visual: {
      mode: visualMode,
      clips,
    },
  }
}

export function buildTracksPayload(plan: ArrangementPlan): FalTrack[] {
  const tracks: FalTrack[] = []

  const audioKeyframes: FalKeyframe[] = []
  for (const block of plan.music.blocks) {
    let cursor = block.startSec
    const blockEnd = block.startSec + block.durationSec
    for (let r = 0; r < block.repeats; r++) {
      const remaining = blockEnd - cursor
      if (remaining <= 0) break
      const dur = Math.min(block.loopLengthSec, remaining)
      audioKeyframes.push({ timestamp: Math.round(cursor * 1000), duration: Math.round(dur * 1000), url: block.loopUrl })
      cursor += dur
    }
  }
  if (audioKeyframes.length > 0) {
    tracks.push({ id: 'audio', type: 'audio', keyframes: audioKeyframes })
  }

  const isImage = plan.visual.mode === 'single-image' || plan.visual.mode === 'multi-image'
  if (plan.visual.clips.length > 0) {
    tracks.push({
      id: 'video',
      type: isImage ? 'image' : 'video',
      keyframes: plan.visual.clips.map((clip) => ({
        timestamp: Math.round(clip.startSec * 1000),
        duration: Math.round(clip.durationSec * 1000),
        url: clip.assetUrl,
      })),
    })
  }

  if (plan.music.bed) {
    tracks.push({
      id: 'ambient-bed',
      type: 'audio',
      keyframes: [{ timestamp: 0, duration: Math.round(plan.totalDurationSec * 1000), url: plan.music.bed.url }],
    })
  }

  return tracks
}
