import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VoiceTone, SceneDensity, StickStyle, ScenePlan } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const TEXT_MODEL = 'gemini-2.5-flash'
const IMAGE_MODEL = 'gemini-2.5-flash-image'

function buildPlanPrompt(tone: VoiceTone, density: SceneDensity, style: StickStyle): string {
  const styleDescriptions: Record<StickStyle, string> = {
    minimal: 'clean, sparse linework; restrained but readable',
    expressive: 'dynamic, exaggerated poses; bouncy energy; cartoonish motion',
    dramatic: 'bold, theatrical poses; heavy shadows; strong contrast',
  }

  return `You are a visual storyboard engine for a hand-drawn stickman explainer video (YouTube style, ~55-60s, beginner-friendly).
Convert the founder story into vivid, cinematic stickman scenes with a CLEAR NARRATIVE ARC: hook → problem/middle → resolution/takeaway.
Return ONLY valid JSON matching this exact schema — no markdown, no prose, no fences.

{
  "title": string,
  "tagline": string,
  "protagonist": string,           // 1 sentence character base — repeated VERBATIM at the start of every imagePrompt for visual consistency. Example: "A simple black stickman with a round head, clean smooth lines, 2-dot eyes, expressive mouth, minimalist proportions, matching the ${tone} mood of the story."
  "scenes": [{
    "id": string,                 // "S1", "S2"...
    "sentence": string,           // exact phrase from story
    "voiceover": string,          // 1-2 short sentences, conversational beginner-friendly English, tone: ${tone}. Describe what stickman is doing + feeling + purpose of the moment.
    "action": string,             // physical stickman action, one sentence
    "setting": string,            // location in <=8 words
    "emotion": "frustration" | "hope" | "excitement" | "despair" | "triumph" | "curiosity" | "relief" | "determination" | "neutral",
    "characters": 1 | 2 | 3,
    "props": string[],             // REQUIRED: at least 1 concrete prop per scene
    "imagePrompt": string         // 90-160 words, see RULES
  }]
}

============================================================
CHARACTER LOCK (consistency across all scenes):
The "protagonist" field defines the recurring character. Every imagePrompt MUST begin with this exact phrase, followed by the protagonist sentence verbatim:
"Use the same stickman character as before: <protagonist sentence>."
Across scenes, ONLY pose, expression, props, setting, FX, and composition change. The character's proportions, head shape, line weight, and style must stay identical.

============================================================
IMAGE PROMPT — REQUIRED CONTENT (write 90-160 words, dense, specific):

Each imagePrompt MUST be a concrete, cinematic description of a SINGLE moment.
After the mandatory "Use the same stickman character as before: ..." opening, include, in order:

1. WHO + EMOTION: count of stickmen, their roles ("solo founder", "founder + skeptical investor", "founder + small crowd"), and current emotion shown via body posture (see ENCODING below).
2. WHAT THEY ARE DOING: exact physical action tied to the story sentence — running, slumping at desk, pitching with arm extended, staring at empty wallet, climbing a graph line, etc. Be specific.
3. SETTING + PROPS: concrete environment — coffee shop, garage, boardroom, server room, mountaintop. List at least 1 (ideally 2-4) minimalist props the character interacts with (laptop, whiteboard with rough chart, coffee cup, suitcase, money bag $, rocket, lightbulb, phone, clock, book).
4. VISUAL EFFECTS (always include at least 2): motion lines, speed swooshes, sweat droplets, exclamation/question marks above head, light rays / radiating sunburst, sparkle stars ✦, smoke puffs, sad rain cloud, thought bubble, broken-heart symbol, fire flames, downward/upward arrow, dotted-line trajectory, impact stars, dollar signs flying, dust kick-up at feet.
5. IN-IMAGE TEXT (always include 1-2 short snippets — this is required, the panel is comic-style):
   - Either a speech bubble with 1-4 word dialogue ("We're done.", "Let's ship it!", "Just one more...", "Why us?")
   - OR a caption banner at top/bottom with 1-5 word situational label ("MONTH 6 — RENT DUE", "FIRST CUSTOMER", "3 AM DEBUG", "PIVOT")
   - OR a sign/whiteboard inside scene with short text ("REJECTED", "SOLD OUT", "MVP")
   Keep text legible, uppercase, hand-lettered feel. Quote the exact text inside the imagePrompt.
6. COMPOSITION: where main character sits in frame (left third / center / right third), camera framing (wide / medium / close), what's in foreground vs background. VARY this between scenes — no two scenes share the same composition.
7. STYLE LOCK: end with "${styleDescriptions[style]}, thick black ink lines, 16:9 wide panel, white paper texture, soft gray shadows, plus 2-3 flat accent colors used sparingly (e.g. warm yellow sunburst, red speech-bubble fill, blue prop highlight, green dollar sign) — colors are flat fills inside ink outlines, no gradients, no shading. NO frame, NO border, NO panel outline — image bleeds to edges."

============================================================
EMOTION ENCODING via body posture (must match scene.emotion):
  triumph → both arms raised diagonally up, chin up, feet apart
  frustration → arms spread wide outward, head tilted back, lines around head
  despair → body hunched forward, arms hanging, sad rain cloud above
  hope → one arm reaching forward toward light/sunburst
  excitement → arms up, body upright, leaping off floor, sparkles
  curiosity → body leaning forward, hand near chin, question mark above
  determination → body leaning forward aggressively, fists clenched, motion lines behind
  relief → arms slightly out, body relaxed, sigh puff from head
  neutral → arms at 35° down, calm stance

============================================================
HARD RULES:
- Stickmen: circle head, single-line torso, line arms, line legs. Black ink only. No detailed faces — emotion conveyed by 2-dot eyes + simple mouth + posture + FX.
- Same protagonist across ALL scenes — only pose/expression/props/setting change.
- Always: floor line near bottom, soft gray shadow ellipse under each character's feet.
- Every scene has at least 1 concrete prop (no empty rooms).
- Each scene MUST be visually distinct from siblings — vary setting, prop, composition, FX.
- Aspect 16:9.
- The imagePrompt must NEVER be generic. Bind it to scene.sentence and scene.action.

NARRATIVE ARC (mandatory):
- First 1-2 scenes = HOOK (relatable opening, sets up character + tension).
- Middle scenes = PROBLEM/JOURNEY (struggle, attempts, emotional beats).
- Last 1-2 scenes = RESOLUTION/TAKEAWAY (payoff, lesson, forward look).
Voiceovers should flow as a single connected story, not isolated captions.

SCENE COUNT:
density=1 → 1 scene per sentence (8-12 scenes total)
density=2 → split at emotional beats, 1-2 per sentence (10-16 scenes total)
density=3 → granular, 2-3 per sentence (14-20 scenes total)
Aim for ~10 scenes when story length allows (matches ~6s/scene for a 60s video).

Current density: ${density}`
}

const IMAGE_STYLE_PREAMBLE = `Generate a single 16:9 wide cartoon panel.
Strict style: hand-drawn stickman comic on off-white paper background, thick black ink linework, slight wobble like a marker on paper, soft gray drop shadows. Stickmen themselves stay black ink only (circle head, dot eyes, simple mouth line, line limbs). Add 2-3 flat accent colors used sparingly on props, FX, speech bubbles, and signs — warm yellow for sunbursts/lightbulbs, red for hearts/alerts/bubble fills, blue for water/tech, green for money/success. Colors are FLAT fills inside ink outlines — no gradients, no shading, no photorealism, no 3D, no anime. No detailed faces. Render speech bubbles, captions, signs, and text EXACTLY as specified using a hand-lettered uppercase style — text must be clearly readable, not gibberish. Render motion lines, sweat drops, sparkles, sunbursts, and other comic FX with visible, deliberate strokes. NO frame, NO border, NO panel outline, NO black bars — image must bleed edge-to-edge on the paper background. The scene must visually match the description below — do not substitute generic stickman art.

SCENE:
`

export async function planStory(
  story: string,
  density: SceneDensity,
  style: StickStyle,
  tone: VoiceTone
): Promise<{ title: string; tagline: string; protagonist: string; scenes: ScenePlan[] }> {
  const model = genAI.getGenerativeModel({
    model: TEXT_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  })

  const systemInstruction = buildPlanPrompt(tone, density, style)

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nFOUNDER STORY:\n${story}` }],
      },
    ],
  })

  return JSON.parse(result.response.text())
}

export async function generateSceneImage(prompt: string): Promise<{ mimeType: string; data: Buffer }> {
  const model = genAI.getGenerativeModel({ model: IMAGE_MODEL })

  const fullPrompt = `${IMAGE_STYLE_PREAMBLE}${prompt}`

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      },
    ],
  })

  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    const inline = (part as { inlineData?: { mimeType?: string; data?: string } }).inlineData
    if (inline?.data) {
      return {
        mimeType: inline.mimeType || 'image/png',
        data: Buffer.from(inline.data, 'base64'),
      }
    }
  }

  throw new Error('Image model returned no image data')
}
