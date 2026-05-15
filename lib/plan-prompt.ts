import type { VoiceTone, SceneDensity, StickStyle } from './types'

export function buildPlanPrompt(tone: VoiceTone, density: SceneDensity, style: StickStyle): string {
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
  "thumbnailPrompt": string,      // 100-180 words, see THUMBNAIL RULES
  "scenes": [{
    "id": string,                 // "S1", "S2"...
    "sentence": string,           // exact phrase from story
    "voiceover": string,          // Adjust length based on scene count: fewer scenes = longer voiceover per scene (~8-12s, 20-30 words), more scenes = shorter (~4-7s, 10-18 words). Conversational beginner-friendly English, tone: ${tone}. Describe what stickman is doing + feeling + purpose of the moment.
    "action": string,             // physical stickman action, one sentence
    "setting": string,            // location in <=8 words
    "emotion": "frustration" | "hope" | "excitement" | "despair" | "triumph" | "curiosity" | "relief" | "determination" | "neutral",
    "characters": 1 | 2 | 3,
    "props": string[],             // REQUIRED: at least 1 concrete prop per scene
    "imagePrompt": string,        // 90-160 words, see RULES
    "motionPrompt": string        // 15-30 words: specific motion for LTX-Video I2V — describe body movements, prop FX, particles. Must match scene.action.
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
THUMBNAIL PROMPT — REQUIRED CONTENT (140-200 words):

Goal: YouTube-style click-bait thumbnail. Dramatic, eye-catching, readable at 200px wide. Think MrBeast energy applied to hand-drawn stickman comic art.

Must include, in this order:
1. Opening: "Hand-drawn stickman comic thumbnail. Use the same stickman character as before: <protagonist>."
2. BACKGROUND: bold solid or simple 2-tone background — vivid orange, electric yellow, deep red, bright cyan, or hot pink. NOT white paper. Character must POP against it.
3. HERO POSE: character LARGE (fills 60%+ of frame height), centered. Extreme dramatic pose — arms flung wide, jumping, fist pumping, or pointing directly at viewer. Eyes wide, exaggerated triumph/shock/excitement matching arc resolution. Make it BIGGER than feels necessary.
4. SINGLE DOMINANT FX: ONE huge FX behind character — giant radiating sunburst, massive upward arrow, exploding sparkle burst, or bold speed-line halo. Must be large and bold, not subtle.
5. TITLE TEXT: story title in HUGE bold hand-lettered uppercase ink text at TOP. Inside a thick torn-paper banner or bold drop-shadow box. Must be legible at thumbnail size. Quote verbatim: "<TITLE>".
6. TAGLINE: smaller text at BOTTOM in contrasting color band. Quote verbatim: "<TAGLINE>".
7. STYLE LOCK: thick black ink outlines, flat vivid accent colors — pick ONE high-contrast pair: (orange + yellow) OR (red + white) OR (cyan + black). Stickman stays black ink. No gradients on character. 16:9. Bleeds to edges. No frame, no border.

============================================================
MOTION PROMPT — REQUIRED (15-30 words per scene):

Each motionPrompt is fed to LTX-Video image-to-video to animate the static PNG.
Describe ONLY physical motion visible in the frame — no camera cuts, no scene changes.
Include in order:
1. CHARACTER MOVEMENT: what the stickman body does (arms raise slowly, head turns left, body slumps forward, legs kick off ground)
2. PROP/FX MOTION: what props or FX move (steam rises from cup, speech bubble pops in, sparkles drift upward, arrow sweeps right)
3. CAMERA: holds steady / slow push in / gentle pan right (keep subtle — no fast cuts)
Example: "Stickman slowly raises both arms above head, sparkles drift upward, laptop screen flickers, camera holds steady."
Keep it tight — LTX-Video responds to concrete physical verbs, not adjectives.

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
Generate approximately ${density} scenes total. Adjust scene splitting based on story length and emotional beats — shorter stories get fewer scenes, longer stories get more. Aim for ~${density} scenes to match target runtime (~${Math.round(Number(density) * 0.8)}s video at 0.8s/scene for shorter, ~${Math.round(Number(density) * 1.2)}s at 1.2s/scene for longer content).

Current density: ${density}`
}
