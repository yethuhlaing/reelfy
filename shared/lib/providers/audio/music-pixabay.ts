import { env } from '@/shared/lib/env'
import type { MusicGenProvider, MusicGenInput, MusicGenSubmitResult } from './music'

export interface PixabayTrack {
  id: number
  user_id: number
  user_image_url: string
  tags: string
  url: string
  audio_url: string
  views: number
  downloads: number
  favorites: number
  likes: number
  duration: number
  genre: string
  artist_name: string
  artist_url: string
  album_name: string
}

export interface PixabayResponse {
  total: number
  hits: PixabayTrack[]
  message?: string
}

function getPixabayApiKey(): string {
  const key = env.PIXABAY_API_KEY
  if (!key) {
    throw new Error('PIXABAY_API_KEY not configured — add it to .env and restart the dev server')
  }
  return key
}

function pixabayHeaders(): HeadersInit {
  const referer = env.PUBLIC_BASE_URL ?? ''
  return {
    ...(referer && { Referer: referer }),
    'User-Agent': 'Mozilla/5.0 (compatible; StickStory/1.0)',
  }
}

export class PixabayProvider implements MusicGenProvider {
  key = 'pixabay'
  label = 'Pixabay Stock Music'
  maxDurationSec = 300
  defaultDurationSec = 30
  creditsPerLoop = 0
  costPerLoopUsd = 0

  private baseUrl = 'https://pixabay.com/api/audio/'

  async submit(_input: MusicGenInput): Promise<MusicGenSubmitResult> {
    throw new Error('Pixabay provider does not support AI generation - use search instead')
  }

  async searchTracks(query: string, perPage = 10): Promise<PixabayTrack[]> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('key', getPixabayApiKey())
    url.searchParams.set('q', query)
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('order', 'popular')

    const response = await fetch(url.toString(), { headers: pixabayHeaders() })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Pixabay API error: ${response.status} — ${body}`)
    }

    const data: PixabayResponse = await response.json()
    return data.hits
  }

  async getTrackById(id: number): Promise<PixabayTrack | null> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('key', getPixabayApiKey())
    url.searchParams.set('ids', String(id))
    url.searchParams.set('per_page', '1')

    const response = await fetch(url.toString(), { headers: pixabayHeaders() })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Pixabay API error: ${response.status} — ${body}`)
    }

    const data: PixabayResponse = await response.json()
    return data.hits.length > 0 ? data.hits[0] : null
  }
}

export const pixabayProvider = new PixabayProvider()
