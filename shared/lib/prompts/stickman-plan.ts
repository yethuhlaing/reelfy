import type { VoiceTone, SceneDensity, StickStyle, Format } from '../types'

// Per-format content-structure rules. Format is orthogonal to StickStyle (look):
// it decides the arc, the voiceover pattern, whether scenes are numbered, how the
// density budget fans out across items, and which emotions are appropriate.
type FormatRule = {
  // Replaces the NARRATIVE ARC block. Describes how the whole video is structured.
  arc: string
  // Injected into the `voiceover` schema hint — the cadence/phrasing per scene.
  voiceoverHint: string
  // Injected into the SCENE COUNT block — how to spread `density` scenes.
  sceneFanOut: string
  // Steers scene.emotion selection (enum is unchanged; this is guidance only).
  emotionGuidance: string
  // Whether facts/tutorial-style item numbering (itemIndex/itemLabel + drawn badge) applies.
  numbered: boolean
}

const formatRules: Record<Format, FormatRule> = {
  narrative: {
    arc: `NARRATIVE ARC (mandatory):
- First 1-2 scenes = HOOK (relatable opening, sets up character + tension).
- Middle scenes = PROBLEM/JOURNEY (struggle, attempts, emotional beats).
- Last 1-2 scenes = RESOLUTION/TAKEAWAY (payoff, lesson, forward look).
Voiceovers should flow as a single connected story, not isolated captions.`,
    voiceoverHint: 'Flowing, connected story — each line continues from the last. Do NOT number scenes.',
    sceneFanOut: 'Split the story into beats; more emotional beats = more scenes.',
    emotionGuidance: 'Use the full emotional range (frustration, despair, hope, triumph, etc.) to build an arc.',
    numbered: false,
  },
  facts: {
    arc: `INFORMATIONAL (FACTS) STRUCTURE — NOT a story arc:
- First 1 scene = INTRO ("Here are 5 tips to win at X", state how many items).
- Middle = each item is a self-contained point, in order, clearly separated. No emotional arc, no "problem" middle.
- Last 1 scene = RECAP/PAYOFF (quick summary or call to action).
Read the number of items from the user's input (e.g. "5 tips" → 5 items). If the input states no number, pick a sensible 5-7. Each item gets a numbered label.`,
    voiceoverHint: 'Start each item scene by announcing its number, e.g. "Tip one: ...", "Number three: ...". Keep items self-contained and factual, not a connected story.',
    sceneFanOut: 'Distribute the ~{density} scenes across the N items (~density/N scenes per item, plus 1 intro + 1 recap). Give each item multiple beats (setup shot, detail, example) rather than one scene each. All scenes of one item share the same itemIndex + itemLabel.',
    emotionGuidance: 'Prefer neutral, curiosity, determination. Do NOT use despair/frustration — this is informational, not dramatic.',
    numbered: true,
  },
  explainer: {
    arc: `EXPLAINER STRUCTURE (teach ONE concept):
- First 1 scene = pose the question / what we'll explain.
- Middle scenes = build the concept step by logical step, each adding one idea.
- Last 1 scene = "so that's why / how it works" synthesis.
No emotional problem arc — this teaches, it doesn't dramatize. Voiceovers connect as a teaching sequence.`,
    voiceoverHint: 'Teaching sequence — each line builds on the previous concept. Do NOT number scenes.',
    sceneFanOut: 'Split the concept into logical steps; one step may take 1-2 scenes.',
    emotionGuidance: 'Prefer curiosity, neutral, determination, and relief/excitement at the "aha" moment. Avoid despair.',
    numbered: false,
  },
  tutorial: {
    arc: `HOW-TO (TUTORIAL) STRUCTURE — ordered steps to DO a thing:
- First 1 scene = setup / what you'll accomplish + what you need.
- Middle = each step in order ("First...", "Next...", "Then..."), one action per step. Numbered.
- Last 1 scene = the finished result.
Read the number of steps from the input if stated; otherwise pick a sensible 4-7. Each step gets a numbered label.`,
    voiceoverHint: 'Announce each step number, e.g. "Step one: ...", "Next, step two: ...". Instructional and concrete.',
    sceneFanOut: 'Distribute the ~{density} scenes across the N steps (~density/N per step, plus 1 setup + 1 result). All scenes of one step share the same itemIndex + itemLabel.',
    emotionGuidance: 'Prefer determination, neutral, curiosity, and relief/triumph at the finished result. Avoid despair.',
    numbered: true,
  },
  comparison: {
    arc: `COMPARISON STRUCTURE (A vs B):
- First 1 scene = introduce the two things being compared.
- Middle = alternate — show what A does, then what B does, across the key dimensions. Keep it balanced.
- Last 1 scene = verdict / when to pick which.
Some tension is fine, but stay fair to both sides. Voiceovers connect as a weighing-up.`,
    voiceoverHint: 'Weigh two sides — "X does this, whereas Y does that". End on a verdict. Do NOT number scenes.',
    sceneFanOut: 'Alternate scenes between side A and side B across dimensions; end with the verdict scene.',
    emotionGuidance: 'Prefer curiosity, determination, neutral. Light triumph on the verdict is fine. Avoid despair.',
    numbered: false,
  },
}

export function stickmanPlanSystemPrompt(tone: VoiceTone, density: SceneDensity, style: StickStyle, format: Format = 'narrative'): string {
  const fmt = formatRules[format]
  const styleDescriptions: Record<StickStyle, string> = {
    minimal: 'clean, sparse linework; restrained but readable',
    expressive: 'dynamic, exaggerated poses; bouncy energy; cartoonish motion',
    dramatic: 'bold, theatrical poses; heavy shadows; strong contrast',
    editorial: 'minimalist wobbly hand-drawn black line art on near-white paper; heavy empty whitespace; sparse red/orange/blue handwritten annotations; clean, absurd, product-sketch feeling',
  }

  const comicRules = (opts: {
    fxRule: string
    textRule: string
    styleLock: string
  }) => `IMAGE PROMPT — REQUIRED CONTENT (write 90-160 words, dense, specific):

Each imagePrompt MUST be a concrete, cinematic description of a SINGLE moment.
After the mandatory "Use the same stickman character as before: ..." opening, include, in order:

1. WHO + EMOTION: count of stickmen, their roles (e.g. "solo protagonist", "protagonist + skeptical investor", "protagonist + small crowd"), and current emotion shown via body posture (see ENCODING below).
2. WHAT THEY ARE DOING: exact physical action tied to the story sentence — running, slumping at desk, pitching with arm extended, staring at empty wallet, climbing a graph line, etc. Be specific.
3. SETTING + PROPS: concrete environment — coffee shop, garage, boardroom, server room, mountaintop. List at least 1 (ideally 2-4) minimalist props the character interacts with (laptop, whiteboard with rough chart, coffee cup, suitcase, money bag $, rocket, lightbulb, phone, clock, book).
4. ${opts.fxRule}
5. ${opts.textRule}
6. COMPOSITION: where main character sits in frame (left third / center / right third), camera framing (wide / medium / close), what's in foreground vs background. VARY this between scenes — no two scenes share the same composition.
7. STYLE LOCK: end with "${opts.styleLock}"`

  const imagePromptRulesByStyle: Record<StickStyle, string> = {
    // Minimal: calm, sparse. Few FX, quiet text, generous whitespace. Closest to "clean".
    minimal: comicRules({
      fxRule: 'VISUAL EFFECTS (include AT MOST 1, subtle): a single motion line, one sweat drop, one small arrow, or one question/exclamation mark. Keep it quiet — no FX stacking. Prefer empty space over decoration.',
      textRule: 'IN-IMAGE TEXT (0-1 snippet, optional): at most one small speech bubble with 1-3 word dialogue, OR none. No caption banners. Keep it minimal.',
      styleLock: `${styleDescriptions[style]}, thin clean black ink lines, 16:9 wide panel, plenty of white space, at most 1-2 flat muted accent colors used sparingly — flat fills inside ink outlines, no gradients, no shading. NO frame, NO border — image bleeds to edges.`,
    }),
    // Expressive: loud, bouncy, cartoonish. Max FX, big bubbles, exaggerated motion.
    expressive: comicRules({
      fxRule: 'VISUAL EFFECTS (include AT LEAST 3, energetic): motion lines, speed swooshes, sparkle stars ✦, impact stars, bouncing dust puffs, exclamation marks, sweat sprays, radiating burst, dollar signs flying. Pile on the cartoon energy.',
      textRule: 'IN-IMAGE TEXT (always 1-2 snippets): a bold speech bubble with 1-4 word dialogue ("Let\'s go!", "No way!", "We did it!") AND/OR a punchy caption banner ("PLOT TWIST", "DAY ONE"). Big, bouncy, hand-lettered uppercase.',
      styleLock: `${styleDescriptions[style]}, bold springy black ink lines with squash-and-stretch, 16:9 wide panel, 3-4 vivid flat accent colors (warm yellow, red, cyan, green) used generously — flat fills inside ink outlines, no gradients. NO frame, NO border — image bleeds to edges.`,
    }),
    // Dramatic: cinematic, high contrast, heavy shadow, theatrical staging.
    dramatic: comicRules({
      fxRule: 'VISUAL EFFECTS (include 2-3, cinematic): strong directional light rays, long cast shadows, dramatic radiating sunburst, spotlight cone, heavy motion lines, smoke, or a single bold arrow. Use FX to build tension and depth.',
      textRule: 'IN-IMAGE TEXT (1-2 snippets, high-impact): a terse speech bubble ("It\'s over.", "Now.") OR a bold caption banner ("THE BREAKING POINT", "ALL IN"). Heavy, uppercase, cinematic hand-lettering.',
      styleLock: `${styleDescriptions[style]}, thick high-contrast black ink lines, 16:9 wide panel, deep soft gray/black shadows and strong chiaroscuro, 2-3 saturated flat accent colors on a moody near-neutral ground — flat fills inside ink outlines, no gradients. NO frame, NO border — image bleeds to edges.`,
    }),
    // Editorial: clean explainer aesthetic (article-illustration register). Fresh visual
    // metaphor per scene, heavy whitespace, restrained color. Keeps ONE optional bubble +
    // 1-2 FX purely as motion anchors so the downstream LTX I2V step still has something to animate.
    editorial: `IMAGE PROMPT — REQUIRED CONTENT (write 90-160 words, dense, specific):

Each imagePrompt MUST turn ONE cognitive anchor from the story sentence into a clean, weird, hand-drawn explainer moment — not a busy comic panel.
After the mandatory "Use the same stickman character as before: ..." opening, include, in order:

1. WHO + EMOTION: count of stickmen, their roles, and emotion shown via body posture (see ENCODING below). Keep the cast small — usually 1, at most 2.
2. STRUCTURE TYPE — pick EXACTLY ONE and vary it across scenes (no two sibling scenes share a structure type): workflow / before-after contrast / split-path decision / layered method (stacked levels) / route-map (path from A to B) / input-output loop / character state-change. Name the chosen structure implicitly through the composition, never as on-image text.
3. FRESH METAPHOR: invent a strange-but-coherent visual metaphor bound to THIS scene.sentence and scene.action. Never reuse a sibling scene's object, layout, or metaphor. The protagonist must PERFORM the core conceptual action (e.g. physically sorting, pulling a path, climbing layers), not stand beside a diagram.
4. SETTING + PROPS: minimal — 1-2 concrete props only, lots of empty space around them. No cluttered environments.
5. VISUAL EFFECTS (include 1-2, restrained): a single arrow, a dotted trajectory, a small burst, sweat drop, or motion line. These double as LTX motion anchors — always leave at least one moving element. No dense FX stacking.
6. IN-IMAGE TEXT: at most ONE short optional speech bubble (1-4 words) OR skip it. Plus 3-6 sparse handwritten English labels pointing at parts of the metaphor (lowercase or small-caps, hand-lettered feel). NO caption banner, NO top-left title, NO structure-type written on the image. Quote any exact text inside the imagePrompt.
7. COMPOSITION: keep the main subject ~40-60% of the canvas, preserve at least 35% blank near-white space. VARY placement and framing between scenes — no two scenes share the same composition.
8. STYLE LOCK: end with "${styleDescriptions[style]}, near-white background, minimalist wobbly black ink line art, lots of empty white space, at most 5-8 short handwritten English labels — black line art plus sparse accents: orange for main flow/arrows, red only for key problems/results, blue only for secondary notes. No gradients, no shading, no paper texture, no comic panel, no PPT/infographic look, no childish cuteness. NO frame, NO border — image bleeds to edges."`,
  }

  // For numbered formats (facts/tutorial), a small consistent corner number badge is
  // REQUIRED and OVERRIDES the per-style "no caption banner / no title" rules above.
  const numberBadgeRule = fmt.numbered
    ? `\n\nNUMBER BADGE (REQUIRED — overrides any "no banner / no title" rule above): draw a small hand-lettered number badge for this scene's item — a circled numeral (e.g. "3") or short label (e.g. "TIP 3" / "STEP 2") — placed in the TOP-RIGHT corner, small, same position and style in every scene. Quote the exact itemLabel text inside the imagePrompt. This is the ONLY caption allowed; keep it small so it never dominates the panel.`
    : ''

  const imagePromptRules = imagePromptRulesByStyle[style] + numberBadgeRule

  // Per-style grounding/whitespace/prop rules injected into HARD RULES.
  const groundingRuleByStyle: Record<StickStyle, string> = {
    minimal: '- Floor line near bottom, faint gray shadow ellipse under feet. Keep the frame airy — plenty of white space, 1-2 props max.',
    expressive: '- Floor line near bottom, soft gray shadow ellipse under feet. Fill the frame with energy — props, FX, and motion welcome.',
    dramatic: '- Floor line near bottom, long dramatic cast shadow under feet. Use deep shadow and staging for cinematic depth; 1-3 purposeful props.',
    editorial: '- No floor line, no shadow, no paper texture. Character floats on clean near-white space. Keep at least 35% empty white space per scene.\n- 1-2 sparse props max per scene — never clutter; empty white space is intentional.',
  }

  return `You are a visual storyboard engine for a hand-drawn stickman explainer video (YouTube style, ~55-60s, beginner-friendly).
Convert the user's input into vivid, cinematic stickman scenes, structured according to the FORMAT below (${format}). The input may be any topic — startup journey, product explainer, list of tips, how-to, history, science, personal anecdote, etc.
Return ONLY valid JSON matching this exact schema — no markdown, no prose, no fences.

{
  "title": string,
  "tagline": string,
  "protagonist": string,           // 1 sentence character base — repeated VERBATIM at the start of every imagePrompt for visual consistency. Example: "A simple black stickman with a round head, clean smooth lines, 2-dot eyes, expressive mouth, minimalist proportions, matching the ${tone} mood of the story."
  "thumbnailPrompt": string,      // 100-180 words, see THUMBNAIL RULES
  "scenes": [{
    "id": string,                 // "S1", "S2"...
    "sentence": string,           // exact phrase from story
    "voiceover": string,          // Adjust length based on scene count: fewer scenes = longer voiceover per scene (~8-12s, 20-30 words), more scenes = shorter (~4-7s, 10-18 words). Conversational beginner-friendly English, tone: ${tone}. FORMAT VOICEOVER: ${fmt.voiceoverHint}
    "action": string,             // physical stickman action, one sentence
    "setting": string,            // location in <=8 words
    "emotion": "frustration" | "hope" | "excitement" | "despair" | "triumph" | "curiosity" | "relief" | "determination" | "neutral",  // EMOTION GUIDANCE: ${fmt.emotionGuidance}
    "characters": 1 | 2 | 3,
    "props": string[],             // REQUIRED: at least 1 concrete prop per scene
    "imagePrompt": string,        // 90-160 words, see RULES${fmt.numbered ? `
    "itemIndex": number,          // REQUIRED for this format: which item (1-based) this scene belongs to. All scenes of the same tip/step share the same itemIndex. Intro scene = 0, recap scene = 0.
    "itemLabel": string,          // REQUIRED for this format: the drawn badge text, e.g. "TIP 3" or "STEP 2". Empty string "" for intro/recap scenes.` : `
    "itemIndex": null,            // null for this format (not a numbered list)
    "itemLabel": null,            // null for this format`}
    "motionPrompt": string        // 15-30 words: specific motion for LTX-Video I2V — describe body movements, prop FX, particles. Must match scene.action.
  }]
}

============================================================
CHARACTER LOCK (consistency across all scenes):
The "protagonist" field defines the recurring character. Every imagePrompt MUST begin with this exact phrase, followed by the protagonist sentence verbatim:
"Use the same stickman character as before: <protagonist sentence>."
Across scenes, ONLY pose, expression, props, setting, FX, and composition change. The character's proportions, head shape, line weight, and style must stay identical.

============================================================
${imagePromptRules}

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
${groundingRuleByStyle[style]}
- Each scene MUST be visually distinct from siblings — vary setting, prop, composition, FX.
- Aspect 16:9.
- The imagePrompt must NEVER be generic. Bind it to scene.sentence and scene.action.

${fmt.arc}

SCENE COUNT:
Generate approximately ${density} scenes total to match target runtime (~${Math.round(Number(density) * 0.8)}s video at 0.8s/scene for shorter, ~${Math.round(Number(density) * 1.2)}s at 1.2s/scene for longer content).
FORMAT FAN-OUT: ${fmt.sceneFanOut.replace('{density}', String(density))}

Current density: ${density} · Format: ${format}`
}

export function stickmanPlanUserMessage(narrative: string): string {
  return `STORY:\n${narrative}`
}

export function stickmanPlanRequest(systemPrompt: string, narrative: string): string {
  return `${systemPrompt}\n\n${stickmanPlanUserMessage(narrative)}`
}
