import { NextResponse } from 'next/server'
import type { PixabayTrack, PixabayResponse } from '@/shared/lib/providers/audio/music-pixabay'
import { pixabayProvider } from '@/shared/lib/providers/audio/music-pixabay'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds timeout for search

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const perPage = searchParams.get('per_page') ?? '10'

  if (!query.trim()) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    const tracks = await pixabayProvider.searchTracks(query, Number(perPage))
    const response: PixabayResponse = {
      total: tracks.length,
      hits: tracks,
    }
    console.log('Pixabay search response:', response)
    return NextResponse.json(response)
  } catch (err) {
    console.error('Pixabay search failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to search Pixabay'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}