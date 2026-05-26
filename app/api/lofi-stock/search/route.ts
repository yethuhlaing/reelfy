import { NextResponse } from 'next/server'
import { browseStockTracksPage, searchStockTracksPage } from '@/features/lofi-stock/server/fetch-tracks'
import type { BrowseTab } from '@/features/lofi-stock/lib/constants'
import { TRACKS_PAGE_SIZE } from '@/features/lofi-stock/lib/browse-constants'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const tab = (searchParams.get('tab') ?? 'popular') as BrowseTab
  const category = searchParams.get('category') ?? ''
  const limit = Math.min(Number(searchParams.get('limit') ?? String(TRACKS_PAGE_SIZE)), 50)
  const offset = Number(searchParams.get('offset') ?? '0')
  const page = Math.max(1, Math.floor(offset / limit) + 1)

  try {
    const result = q.trim()
      ? await searchStockTracksPage({ query: q.trim(), page, pageSize: limit })
      : await browseStockTracksPage({
          tab,
          categoryId: category || null,
          page,
          pageSize: limit,
        })

    return NextResponse.json({
      tracks: result.tracks,
      hasMore: result.hasMore,
      page: result.page,
      pageSize: result.pageSize,
    })
  } catch (err) {
    console.error('Freetouse search failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch tracks'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
