import { fal } from '@/shared/lib/providers/fal'
import { generateVoiceover } from '@/shared/lib/integrations/elevenlabs'
import type { BrainrotCaptionPosition } from '@/shared/lib/types/brainrot'
import type { WordTiming } from '@/shared/lib/types'
import {
  BRAINROT_VOICE_SPEED,
  COMPOSE_MODEL_ID,
  SUBTITLE_MODEL_ID,
} from '@/features/brainrot/constants'
import { pickSequentialChunks } from '@/features/brainrot/server/chunk-picker'
import { nextBrainrotChunkCursor } from '@/shared/lib/db/config'
import { uploadBrainrotVoiceover } from '@/features/brainrot/server/brainrot-assets'
import type { FalTrack } from '@/features/lofi/server/arrangement'

type FalKeyframe = { timestamp: number; duration: number; url: string }

function buildComposeTracks(
  chunks: { url: string; durationMs: number }[],
  voiceoverUrl: string,
  totalDurationMs: number,
): FalTrack[] {
  let cursorMs = 0
  const videoKeyframes: FalKeyframe[] = chunks.map((chunk) => {
    const kf = { timestamp: cursorMs, duration: chunk.durationMs, url: chunk.url }
    cursorMs += chunk.durationMs
    return kf
  })

  return [
    { id: 'video', type: 'video', keyframes: videoKeyframes },
    {
      id: 'audio',
      type: 'audio',
      keyframes: [{ timestamp: 0, duration: totalDurationMs, url: voiceoverUrl }],
    },
  ]
}

function voiceoverDurationFromTimings(wordTimings: WordTiming[]): number {
  if (!wordTimings.length) return 0
  return wordTimings[wordTimings.length - 1]!.endMs / 1000
}

export async function rehostToFal(url: string, filename: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch ${filename}: HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const file = new File([buf], filename, { type: 'audio/mpeg' })
  return fal.storage.upload(file)
}

export async function generateBrainrotVoiceover(input: {
  projectId: string
  script: string
  characterVoiceId: string
  userId: string
  signal?: AbortSignal
}): Promise<{
  voiceoverUrl: string
  voiceoverDurationSec: number
  wordTimings: WordTiming[]
}> {
  // characterVoiceId now IS the ElevenLabs voice_id (curated brainrot roster).
  const { audio, wordTimings } = await generateVoiceover(
    input.script,
    input.signal,
    { userId: input.userId, operation: 'brainrot_voiceover' },
    input.characterVoiceId,
    { speed: BRAINROT_VOICE_SPEED },
  )

  const voiceoverUrl = await uploadBrainrotVoiceover(input.projectId, Buffer.from(audio))
  const voiceoverDurationSec = voiceoverDurationFromTimings(wordTimings)
  return { voiceoverUrl, voiceoverDurationSec, wordTimings }
}

function mapCaptionPositionToFal(position: BrainrotCaptionPosition): 'top' | 'center' | 'bottom' {
  if (position === 'top') return 'top'
  if (position === 'middle') return 'center'
  return 'bottom'
}

// Keep captions off the video edges (safe margin on a 1920px-tall canvas).
// y_offset: positive = down, negative = up. Push bottom captions up and top
// captions down so they don't hug the frame edge.
const SUBTITLE_EDGE_MARGIN_PX = 160
// Nudge center captions just below the exact middle line — sitting slightly low
// reads better over gameplay than dead-center.
const SUBTITLE_CENTER_DROP_PX = 120

function subtitleYOffset(position: 'top' | 'center' | 'bottom'): number {
  if (position === 'top') return SUBTITLE_EDGE_MARGIN_PX
  if (position === 'bottom') return -SUBTITLE_EDGE_MARGIN_PX
  return SUBTITLE_CENTER_DROP_PX
}

export async function submitBrainrotCompose(input: {
  tracks: FalTrack[]
  webhookUrl: string
}): Promise<string> {
  const submitted = await fal.queue.submit(COMPOSE_MODEL_ID, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: { tracks: input.tracks } as any,
    webhookUrl: input.webhookUrl,
  })
  return submitted.request_id
}

export async function submitBrainrotSubtitles(input: {
  videoUrl: string
  captionPosition: BrainrotCaptionPosition
  webhookUrl: string
}): Promise<string> {
  const position = mapCaptionPositionToFal(input.captionPosition)
  const submitted = await fal.queue.submit(SUBTITLE_MODEL_ID, {
    input: {
      video_url: input.videoUrl,
      position,
      y_offset: subtitleYOffset(position),
      words_per_subtitle: 1,
      font_name: 'Montserrat',
      font_size: 72,
      font_color: 'white',
      highlight_color: 'yellow',
      enable_animation: false,
    },
    webhookUrl: input.webhookUrl,
  })
  return submitted.request_id
}

export async function prepareBrainrotExportAssets(input: {
  projectId: string
  script: string
  backgroundCategory: string
  characterVoiceId: string
  userId: string
  reuseVoiceover?: {
    voiceoverUrl: string
    voiceoverDurationSec: number
    wordTimings: WordTiming[]
    backgroundVideoId: string | null
    chunkStartIndex: number | null
    chunkUrls: string[] | null
  } | null
  signal?: AbortSignal
}) {
  let voiceoverUrl: string
  let voiceoverDurationSec: number
  let wordTimings: WordTiming[]

  if (input.reuseVoiceover) {
    voiceoverUrl = input.reuseVoiceover.voiceoverUrl
    voiceoverDurationSec = input.reuseVoiceover.voiceoverDurationSec
    wordTimings = input.reuseVoiceover.wordTimings
  } else {
    const voice = await generateBrainrotVoiceover({
      projectId: input.projectId,
      script: input.script,
      characterVoiceId: input.characterVoiceId,
      userId: input.userId,
      signal: input.signal,
    })
    voiceoverUrl = voice.voiceoverUrl
    voiceoverDurationSec = voice.voiceoverDurationSec
    wordTimings = voice.wordTimings
  }

  const canReuseChunks =
    !!input.reuseVoiceover?.chunkUrls?.length &&
    input.reuseVoiceover.backgroundVideoId != null &&
    input.reuseVoiceover.chunkStartIndex != null

  const picked = canReuseChunks
    ? {
        videoId: input.reuseVoiceover!.backgroundVideoId!,
        startIndex: input.reuseVoiceover!.chunkStartIndex!,
        chunks: input.reuseVoiceover!.chunkUrls!.map((url, i) => {
          const totalMs = Math.ceil(voiceoverDurationSec * 1000)
          const chunkMs = 30_000
          const priorMs = chunkMs * i
          const remaining = totalMs - priorMs
          const durationMs = Math.min(chunkMs, remaining)
          return { url, durationMs: Math.max(1, durationMs) }
        }),
      }
    : pickSequentialChunks(
        input.backgroundCategory,
        voiceoverDurationSec,
        await nextBrainrotChunkCursor(input.backgroundCategory),
      )

  const videoId = picked.videoId
  const startIndex = picked.startIndex
  const chunkUrls = picked.chunks.map((c) => c.url)
  const chunks = picked.chunks

  const falVoiceUrl = await rehostToFal(voiceoverUrl, `${input.projectId}.mp3`)
  const tracks = buildComposeTracks(chunks, falVoiceUrl, Math.ceil(voiceoverDurationSec * 1000))

  return {
    voiceoverUrl,
    voiceoverDurationSec,
    wordTimings,
    backgroundVideoId: videoId,
    chunkStartIndex: startIndex,
    chunkUrls,
    tracks,
  }
}
