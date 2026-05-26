import { NextResponse } from 'next/server'
import { freetouseProvider } from '@/shared/lib/providers/audio/music-freetouse'
import type { TrackOrder } from '@/shared/lib/providers/audio/music-freetouse'

export const runtime = 'nodejs'
export const maxDuration = 30

const TAB_TO_ORDER: Record<string, TrackOrder> = {
  popular: 'downloads',
  new: 'release_date',
  staff: 'staff_order',
  random: 'random',
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const tab = searchParams.get('tab') ?? 'popular'
  const category = searchParams.get('category') ?? ''
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50)
  const offset = Number(searchParams.get('offset') ?? '0')

  const order = TAB_TO_ORDER[tab] ?? 'downloads'

  try {
    const tracks = q.trim()
      ? await freetouseProvider.searchTracks(q.trim(), { limit, offset })
      : await freetouseProvider.browseTracks({
          order,
          categoryId: category || undefined,
          limit,
          offset,
        })

    return NextResponse.json({ tracks, hasMore: tracks.length === limit })
  } catch (err) {
    console.error('Freetouse search failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch tracks'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
