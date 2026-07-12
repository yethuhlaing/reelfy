import { BRAINROT_CHUNK_SEC } from '@/features/brainrot/constants'
import { GAMEPLAY_CATALOG, type GameplayCategory, type GameplayVideo } from '@/shared/data/gameplay-catalog'

export type PickedChunks = {
  videoId: string
  videoLabel: string
  startIndex: number
  chunks: { url: string; durationMs: number }[]
}

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1))
}

function chunksNeededFor(voiceoverDurationSec: number): number {
  const neededMs = Math.ceil(voiceoverDurationSec * 1000)
  const chunkMs = BRAINROT_CHUNK_SEC * 1000
  return Math.max(1, Math.ceil(neededMs / chunkMs))
}

/**
 * Slice `chunksNeeded` chunks from a single video starting at `startIndex`,
 * looping within that same video if it runs short. Never crosses into another
 * video, so a short (e.g. ~60s / 2-chunk) export never stitches two unrelated
 * background clips together. Trims the last chunk to the exact remaining time.
 */
function sliceChunks(
  video: GameplayVideo,
  startIndex: number,
  voiceoverDurationSec: number,
): { url: string; durationMs: number }[] {
  const neededMs = Math.ceil(voiceoverDurationSec * 1000)
  const chunkMs = BRAINROT_CHUNK_SEC * 1000
  const chunksNeeded = chunksNeededFor(voiceoverDurationSec)

  const selected = Array.from(
    { length: chunksNeeded },
    (_, i) => video.chunks[(startIndex + i) % video.chunks.length]!,
  )
  let remainingMs = neededMs
  return selected.map((chunk, idx) => {
    const durationMs = idx === selected.length - 1 ? remainingMs : Math.min(chunkMs, remainingMs)
    remainingMs -= durationMs
    return { url: chunk.url, durationMs }
  })
}

type ChunkWindow = { video: GameplayVideo; startIndex: number }

/**
 * Enumerate every non-overlapping window of `chunksNeeded` contiguous chunks
 * across ALL videos (templates) in a category, in a stable order. Each window
 * stays entirely within one video. A category with many templates therefore
 * yields many windows, so a sequential cursor walks through all background
 * footage before any window repeats.
 */
function enumerateWindows(category: GameplayCategory, chunksNeeded: number): ChunkWindow[] {
  const windows: ChunkWindow[] = []
  for (const video of category.videos) {
    const len = video.chunks.length
    if (len === 0) continue
    // Tile back-to-back: [0..n-1], [n..2n-1], ... The final window may be short;
    // sliceChunks loops within the same video to fill it (never crosses videos).
    for (let start = 0; start < len; start += chunksNeeded) {
      windows.push({ video, startIndex: start })
    }
  }
  return windows
}

/**
 * Deterministic, non-repeating chunk selection driven by a per-category cursor.
 *
 * Windows are enumerated across every template in the category, then the window
 * at `cursor % windowCount` is returned. Advancing the cursor on each export
 * (see nextBrainrotChunkCursor) spreads exports across all background footage so
 * consecutive videos don't reuse the same chunks, and no template is mixed
 * inside a single video.
 */
export function pickSequentialChunks(
  categoryId: string,
  voiceoverDurationSec: number,
  cursor: number,
  catalog: GameplayCategory[] = GAMEPLAY_CATALOG,
): PickedChunks {
  const category = catalog.find((c) => c.id === categoryId)
  if (!category?.videos.length) {
    throw new Error(`Unknown or empty gameplay category: ${categoryId}`)
  }

  const chunksNeeded = chunksNeededFor(voiceoverDurationSec)
  const windows = enumerateWindows(category, chunksNeeded)
  if (windows.length === 0) {
    throw new Error(`No usable chunks for gameplay category: ${categoryId}`)
  }

  const idx = ((cursor % windows.length) + windows.length) % windows.length
  const { video, startIndex } = windows[idx]!

  return {
    videoId: video.id,
    videoLabel: video.label,
    startIndex,
    chunks: sliceChunks(video, startIndex, voiceoverDurationSec),
  }
}

/**
 * Legacy random picker. Retained for callers/tests that don't have a cursor;
 * the export path now uses pickSequentialChunks.
 */
export function pickRandomChunks(
  categoryId: string,
  voiceoverDurationSec: number,
  catalog: GameplayCategory[] = GAMEPLAY_CATALOG,
): PickedChunks {
  const category = catalog.find((c) => c.id === categoryId)
  if (!category?.videos.length) {
    throw new Error(`Unknown or empty gameplay category: ${categoryId}`)
  }

  const video = category.videos[randomInt(category.videos.length - 1)]!
  if (!video.chunks.length) {
    throw new Error(`Video ${video.id} has no chunks`)
  }

  const startIndex = randomInt(video.chunks.length - 1)
  return {
    videoId: video.id,
    videoLabel: video.label,
    startIndex,
    chunks: sliceChunks(video, startIndex, voiceoverDurationSec),
  }
}
