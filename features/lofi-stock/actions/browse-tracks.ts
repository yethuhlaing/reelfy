'use server'

import {
  browseStockTracksPage,
  fetchTrackWaveformsByIds,
  searchStockTracksPage,
  type StockTracksPage,
} from '@/features/lofi-stock/server/fetch-tracks'
import type { BrowseTab } from '@/features/lofi-stock/lib/constants'

export async function fetchBrowseTracksAction(input: {
  tab: BrowseTab
  categoryId: string | null
  page: number
}): Promise<StockTracksPage> {
  return browseStockTracksPage({
    tab: input.tab,
    categoryId: input.categoryId,
    page: input.page,
  })
}

export async function fetchSearchTracksAction(input: {
  query: string
  page: number
}): Promise<StockTracksPage> {
  return searchStockTracksPage({
    query: input.query,
    page: input.page,
  })
}

export async function fetchTrackWaveformsAction(
  trackIds: string[],
): Promise<Record<string, number[]>> {
  return fetchTrackWaveformsByIds(trackIds)
}
