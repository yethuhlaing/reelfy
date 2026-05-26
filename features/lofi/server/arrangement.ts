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

export function allPlanUrls(plan: ArrangementPlan): string[] {
  const urls: string[] = []
  for (const block of plan.music.blocks) {
    urls.push(block.loopUrl)
  }
  for (const clip of plan.visual.clips) {
    urls.push(clip.assetUrl)
  }
  if (plan.music.bed) {
    urls.push(plan.music.bed.url)
  }
  return urls
}

export function buildFilterGraph(plan: ArrangementPlan): string {
  const numMusicLoops = plan.music.blocks.length
  const numVisualClips = plan.visual.clips.length
  const hasBed = plan.music.bed !== null

  const filters: string[] = []

  for (let i = 0; i < numMusicLoops; i++) {
    const block = plan.music.blocks[i]
    filters.push(`[${i}:a]aloop=-1:size=1:start=0,atrim=end_sample=${block.durationSec},asetpts=N/SR/TB[l${i}]`)
  }

  for (let vi = 0; vi < numVisualClips; vi++) {
    const clip = plan.visual.clips[vi]
    const inputIdx = numMusicLoops + vi
    const isImage = plan.visual.mode === 'single-image' || plan.visual.mode === 'multi-image'
    if (isImage) {
      filters.push(`[${inputIdx}:v]loop=-1:size=1:start=0,scale=1920:1080:force_original_aspect_ratio=cover,crop=1920:1080,setsar=1[v${vi}]`)
    } else {
      filters.push(`[${inputIdx}:v]trim=0:${clip.durationSec},scale=1920:1080:force_original_aspect_ratio=cover,crop=1920:1080,setsar=1[v${vi}]`)
    }
  }

  if (hasBed) {
    const bedIdx = numMusicLoops + numVisualClips
    filters.push(`[${bedIdx}:a]aloop=-1:size=1:start=0,atrim=end_sample=${plan.totalDurationSec},volume=${plan.music.bed!.gainDb}dB[bed]`)
  }

  const audioLabels: string[] = []
  for (let i = 0; i < numMusicLoops; i++) {
    audioLabels.push(`l${i}`)
  }

  let aout: string
  if (audioLabels.length === 0) {
    aout = 'anull'
    filters.push(`anullsink[aout]`)
  } else if (audioLabels.length === 1) {
    aout = audioLabels[0]
    filters.push(`[${aout}]anull[aout]`)
  } else {
    let prevLabel = audioLabels[0]
    for (let ai = 1; ai < audioLabels.length; ai++) {
      const xfadeLabel = `ac${ai}`
      filters.push(`[${prevLabel}][${audioLabels[ai]}]acrossfade=d=${MUSIC_CROSSFADE_SEC}[${xfadeLabel}]`)
      prevLabel = xfadeLabel
    }
    aout = prevLabel
    if (hasBed) {
      filters.push(`[${aout}][bed]amix=inputs=2:duration=first[aout]`)
    } else {
      filters.push(`[${aout}]anull[aout]`)
    }
  }

  let vout: string
  if (numVisualClips === 0) {
    vout = 'black'
    filters.push(`color=c=black:s=1920x1080:d=${plan.totalDurationSec}[vout]`)
  } else if (numVisualClips === 1) {
    vout = `v0`
    filters.push(`[${vout}]format=yuv420p[vout]`)
  } else {
    let prevLabel = `v0`
    for (let vi = 1; vi < numVisualClips; vi++) {
      const xfadeLabel = `vx${vi}`
      const offset = plan.visual.clips[vi].startSec
      filters.push(`[${prevLabel}][v${vi}]xfade=transition=fade:duration=${VISUAL_CROSSFADE_SEC}:offset=${offset}[${xfadeLabel}]`)
      prevLabel = xfadeLabel
    }
    filters.push(`[${prevLabel}]format=yuv420p[vout]`)
  }

  return filters.join(';\n')
}
