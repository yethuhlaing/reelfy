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

export function getMusicProvider(key?: string): MusicGenProvider {
  const id = key ?? process.env.MUSIC_MODEL ?? 'minimax'
  if (!MUSIC_PROVIDERS[id]) {
    console.warn(`Unknown MUSIC_MODEL "${id}", falling back to minimax`)
  }
  return MUSIC_PROVIDERS[id] ?? MUSIC_PROVIDERS['minimax']
}

export function listMusicProviders() {
  return Object.values(MUSIC_PROVIDERS)
}

export const MUSIC_PROVIDERS: Record<string, MusicGenProvider> = {}
