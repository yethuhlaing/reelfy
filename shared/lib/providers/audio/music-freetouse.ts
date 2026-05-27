import type { MusicGenProvider, MusicGenInput, MusicGenSubmitResult } from './music'

const BASE_URL = 'https://api.freetouse.com/v3'

export interface FreetouseArtist {
  id: string
  name: string
}

export interface FreetouseCategory {
  id: string
  name: string
}

export interface FreetouseTrack {
  id: string
  title: string
  duration: number
  genre: string
  release_date: string
  views: number
  plays: number
  downloads: number
  likes: number
  is_premium: boolean
  waveform: number[]
  staff_order: number
  artists: [number, FreetouseArtist][]
  categories: [number, FreetouseCategory][]
  tags: [number, string][]
  thumbnails: { sm: string; md: string; lg: string; xl: string }
  files: { mp3: string }
}

export type TrackOrder = 'downloads' | 'release_date' | 'staff_order' | 'random'
export type FreetouseTab = 'popular' | 'new' | 'staff' | 'random'

export const TAB_ORDER: Record<FreetouseTab, TrackOrder> = {
  popular: 'downloads',
  new: 'release_date',
  staff: 'staff_order',
  random: 'random',
}

interface TracksResponse {
  ok: boolean
  data: FreetouseTrack[]
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Freetouse API error: ${res.status} — ${body}`)
  }
  return res.json() as Promise<T>
}

export class FreetouseProvider implements MusicGenProvider {
  key = 'freetouse'
  label = 'Free To Use Stock Music'
  maxDurationSec = 300
  defaultDurationSec = 30
  creditsPerLoop = 0
  costPerLoopUsd = 0

  async submit(_input: MusicGenInput): Promise<MusicGenSubmitResult> {
    throw new Error('Freetouse provider does not support AI generation — use search instead')
  }

  async browseTracks(opts: {
    order?: TrackOrder
    categoryId?: string
    limit?: number
    offset?: number
  }): Promise<FreetouseTrack[]> {
    const { order = 'downloads', categoryId, limit = 20, offset = 0 } = opts
    const params: Record<string, string> = {
      order,
      sort: order === 'random' ? 'asc' : 'desc',
      limit: String(limit),
      offset: String(offset),
    }
    const path = categoryId
      ? `/music/categories/${categoryId}/tracks`
      : '/music/tracks/all'
    const data = await apiFetch<TracksResponse>(path, params)
    return (data.data ?? []).filter((t) => !t.is_premium)
  }

  async searchTracks(
    query: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<FreetouseTrack[]> {
    const { limit = 20, offset = 0 } = opts
    const data = await apiFetch<TracksResponse>('/music/tracks/search', {
      query,
      limit: String(limit),
      offset: String(offset),
    })
    return (data.data ?? []).filter((t) => !t.is_premium)
  }

  async fetchTrackById(trackId: string): Promise<FreetouseTrack | null> {
    try {
      const data = await apiFetch<{ ok: boolean; data: FreetouseTrack }>(
        `/music/tracks/${trackId}`,
      )
      const track = data.data
      if (!track || track.is_premium) return null
      return track
    } catch {
      return null
    }
  }
}

export const freetouseProvider = new FreetouseProvider()
