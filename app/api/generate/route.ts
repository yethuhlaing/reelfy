import { NextResponse } from 'next/server'
import { generateStory } from '@/lib/gemini'
import type { SceneDensity, StickStyle, VoiceTone } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { story, density, style, tone } = body as {
      story: string
      density: SceneDensity
      style: StickStyle
      tone: VoiceTone
    }

    if (!story || !density || !style || !tone) {
      return NextResponse.json(
        { error: 'Missing required fields: story, density, style, tone' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const data = await generateStory(story, density, style, tone)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate story' },
      { status: 500 }
    )
  }
}
