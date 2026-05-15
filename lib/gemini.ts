import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VoiceTone, SceneDensity, StickStyle } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export function buildPrompt(tone: VoiceTone, density: SceneDensity, style: StickStyle): string {
  const styleDescriptions: Record<StickStyle, string> = {
    minimal: 'Simple, clean lines with minimal detail',
    expressive: 'More dynamic poses with visible emotion in body language',
    dramatic: 'Bold, exaggerated poses with strong visual impact',
  }

  return `You are a startup storytelling engine. Convert the founder story into stickman animation scenes.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation.

{
  "title": string,
  "tagline": string,
  "scenes": [{
    "id": string,           // "S1", "S2"...
    "sentence": string,     // exact phrase from story
    "voiceover": string,    // polished narration, tone: ${tone}
    "action": string,       // physical stickman action
    "setting": string,      // minimal setting
    "emotion": "frustration" | "hope" | "excitement" | "despair" | "triumph" | "curiosity" | "relief" | "determination" | "neutral",
    "characters": 1 | 2 | 3,
    "props": string[],
    "svgScene": string      // COMPLETE SVG, rules below
  }]
}

SVG RULES:
- viewBox="0 0 800 450", white background rect fill="white"
- Style: ${styleDescriptions[style]}
- Stickmen: circle head r=18, body line, arm lines, leg lines
- stroke="#1a1a1a" stroke-width="2.5" fill="none" on all stickmen
- Show emotion via body posture ONLY:
    triumph → both arms raised diagonal up
    frustration → arms spread wide outward
    despair → body hunched forward, arms hanging down
    hope → one arm reaching forward
    excitement → arms up, body upright
    curiosity → body leaning forward, one hand near chin
    determination → body leaning forward aggressively
    relief → arms slightly out, body relaxed
    neutral → arms at 35deg down
- Props as simple geometry: desk=rect, laptop=small rect on desk,
  city skyline=vertical rects varying heights, door=rect+line,
  phone=tiny rounded rect, crowd=3 small stickmen in background
- Always add: floor line at y=360, subtle shadow ellipse under feet
- Position main character at x=300-500, y=220-280
- Each scene visually UNIQUE — vary character position, props, layout

SCENE COUNT:
density=1 → 1 scene per sentence (8-12 scenes)
density=2 → split at emotional beats, 1-2 per sentence (10-16 scenes)
density=3 → granular, 2-3 per sentence (14-20 scenes)

Current density setting: ${density}`
}

export async function generateStory(
  story: string,
  density: SceneDensity,
  style: StickStyle,
  tone: VoiceTone
) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const systemInstruction = buildPrompt(tone, density, style)

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nFOUNDER STORY:\n${story}` }],
      },
    ],
  })

  const response = result.response
  const text = response.text()

  return JSON.parse(text)
}
