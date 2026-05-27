import {
  freetouseProvider,
  TAB_ORDER,
  type FreetouseTrack,
} from '@/shared/lib/providers/audio/music-freetouse'
import type { BrowseTab } from '@/features/lofi-stock/lib/constants'
import { TRACKS_PAGE_SIZE } from '@/features/lofi-stock/lib/browse-constants'

export type StockTracksPage = {
  tracks: FreetouseTrack[]
  hasMore: boolean
  page: number
  pageSize: number
  totalLoaded: number
}

export async function browseStockTracksPage(input: {
  tab: BrowseTab
  categoryId: string | null
  page: number
  pageSize?: number
}): Promise<StockTracksPage> {
  const pageSize = input.pageSize ?? TRACKS_PAGE_SIZE
  const page = Math.max(1, input.page)
  const offset = (page - 1) * pageSize
  const order = TAB_ORDER[input.tab]

  const tracks = await freetouseProvider.browseTracks({
    order,
    categoryId: input.categoryId ?? undefined,
    limit: pageSize,
    offset,
  })

  return {
    tracks,
    hasMore: tracks.length === pageSize,
    page,
    pageSize,
    totalLoaded: offset + tracks.length,
  }
}

export async function fetchTrackWaveformsByIds(
  trackIds: string[],
): Promise<Record<string, number[]>> {
  const uniqueIds = [...new Set(trackIds.filter(Boolean))]
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      const track = await freetouseProvider.fetchTrackById(id)
      return [id, track?.waveform ?? []] as const
    }),
  )
  return Object.fromEntries(entries)
}

export async function searchStockTracksPage(input: {
  query: string
  page: number
  pageSize?: number
}): Promise<StockTracksPage> {
  const pageSize = input.pageSize ?? TRACKS_PAGE_SIZE
  const page = Math.max(1, input.page)
  const offset = (page - 1) * pageSize
  const q = input.query.trim()

  if (!q) {
    return { tracks: [], hasMore: false, page: 1, pageSize, totalLoaded: 0 }
  }

  const tracks = await freetouseProvider.searchTracks(q, { limit: pageSize, offset })

  return {
    tracks,
    hasMore: tracks.length === pageSize,
    page,
    pageSize,
    totalLoaded: offset + tracks.length,
  }
}
