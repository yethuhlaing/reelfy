import type { BrainrotFormat } from '@/shared/lib/types/brainrot'
import {
  BRAINROT_TARGET_WORDS_MAX,
  BRAINROT_TARGET_WORDS_MIN,
} from '@/features/brainrot/constants'

type FormatRule = {
  arc: string
  voiceoverHint: string
}

const formatRules: Record<BrainrotFormat, FormatRule> = {
  narrative: {
    arc: `NARRATIVE ARC:
- Open with a hook in the first 1-2 sentences (relatable tension or curiosity).
- Middle = problem/journey with emotional beats.
- Close with payoff, lesson, or forward look.
Write as one continuous spoken monologue, not bullet points.`,
    voiceoverHint: 'Flowing connected story — each sentence leads to the next.',
  },
  facts: {
    arc: `FACTS / LIST STRUCTURE:
- Open by stating how many points you'll cover (e.g. "Here are 5 psychology tricks...").
- Middle = each item is a self-contained point, announced with its number.
- Close with a quick recap or call to action.
Read item count from user input when stated; otherwise use 5-7 items.`,
    voiceoverHint: 'Announce each item: "Number one...", "Tip two...", etc. Keep items factual and punchy.',
  },
  explainer: {
    arc: `EXPLAINER STRUCTURE:
- Open with the question or concept you'll explain.
- Middle = build the idea step by logical step.
- Close with synthesis: "So that's why..." or "That's how it works."
Teach one concept — no emotional drama arc.`,
    voiceoverHint: 'Teaching sequence — each line adds one idea to the last.',
  },
}

export function brainrotPlanSystemPrompt(format: BrainrotFormat): string {
  const fmt = formatRules[format]
  return `You write spoken narration scripts for short vertical "brainrot" reels (TikTok/Instagram).
The script will be read aloud by a cartoon character voice over gameplay footage.

OUTPUT: Return ONLY valid JSON matching this schema:
{
  "title": "short catchy title, max 8 words",
  "script": "the full spoken narration as one continuous paragraph"
}

==== FORMAT RULES (${format}) ====
${fmt.arc}

VOICEOVER STYLE: ${fmt.voiceoverHint}

==== LENGTH (mandatory) ====
- Target ${BRAINROT_TARGET_WORDS_MIN}–${BRAINROT_TARGET_WORDS_MAX} words (~35–45 seconds spoken).
- Short punchy sentences. No stage directions. No [pause] tags. No markdown.
- Write for the ear — contractions, casual rhythm, viral reel energy.

==== INPUT MODES ====
- If the user gives a ROUGH IDEA (short prompt): expand into a full script following the format above.
- If the user pastes a LONG DRAFT (80+ words): tighten, clean, and reshape to fit the format and word count. Preserve their core message.

==== HARD RULES ====
- script must be plain spoken text only — no labels, no scene numbers, no timestamps.
- Do not mention "video", "reel", or "subscribe".
- Hook hard in the first sentence.`
}

export function brainrotPlanUserMessage(input: string): string {
  return `USER INPUT:\n${input.trim()}`
}

export function brainrotPlanRequest(format: BrainrotFormat, input: string): string {
  return `${brainrotPlanSystemPrompt(format)}\n\n${brainrotPlanUserMessage(input)}`
}

export type BrainrotPlanResult = {
  title: string
  script: string
}
