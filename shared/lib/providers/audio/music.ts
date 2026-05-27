import { env } from '@/shared/lib/env'
import { minimaxProvider } from './music-fal-minimax'
import { stableAudioProvider } from './music-fal-stable-audio'
import { cassetteProvider } from './music-fal-cassette'
import { freetouseProvider } from './music-freetouse'

export interface MusicGenInput {
  prompt: string
  durationSec: number
  webhookUrl: string
}

export interface MusicGenSubmitResult {
  jobId: string
  falModel: string
  estimatedCostUsd: number
}

export interface MusicGenProvider {
  key: string
  label: string
  maxDurationSec: number
  defaultDurationSec: number
  creditsPerLoop: number
  costPerLoopUsd: number
  submit(input: MusicGenInput): Promise<MusicGenSubmitResult>
}

const MUSIC_PROVIDERS: Record<string, MusicGenProvider> = {
  minimax: minimaxProvider,
  'stable-audio': stableAudioProvider,
  cassette: cassetteProvider,
  freetouse: freetouseProvider,
}

const DEFAULT_MUSIC_PROVIDER = MUSIC_PROVIDERS.minimax

export function getMusicProvider(key?: string): MusicGenProvider {
  const id = key ?? env.MUSIC_MODEL ?? 'minimax'
  const provider = MUSIC_PROVIDERS[id]
  if (!provider) {
    console.warn(`Unknown MUSIC_MODEL "${id}", falling back to minimax`)
  }
  const resolved = provider ?? DEFAULT_MUSIC_PROVIDER
  if (!resolved) {
    throw new Error('No music providers configured')
  }
  return resolved
}
