export interface LofiPlanInput {
  targetMusicCount: number
  targetVisualCount: number
}

export function lofiPlanSystemPrompt(input: LofiPlanInput): string {
  return `You generate prompt sets for AI-generated lofi YouTube videos. Given a single vibe phrase, return JSON with:
- musicPrompts: array of exactly ${input.targetMusicCount} short prompts for instrumental lofi music. Each prompt should describe a slight variation of the same mood (different instrument focus, energy level, tempo subtly different). All should fit together as one cohesive listening session.
- visualMode: choose the best fit from "single-image", "multi-image", "single-video", "multi-video". Use "single-image" for calm static vibes, "multi-image" when the vibe implies multiple scenes or changing settings, "single-video" for subtle motion (rain, steam, flickering), "multi-video" only for very dynamic vibes.
- visualPrompts: array of exactly ${input.targetVisualCount} prompts that feel like the same world from different angles or moments — cohesive, not jarring.
- suggestedTitle: a short YouTube-style title (≤60 chars).
- suggestedAmbientBed: pick best fit from rain/vinyl/fireplace/cafe based on the vibe, or null if none fit.

Return strict JSON, no markdown.`
}

export function lofiPlanUserMessage(vibe: string, targetDurationSec: number): string {
  return `VIBE: "${vibe}"\nTARGET DURATION: ${Math.round(targetDurationSec / 60)} minutes`
}

export const LOFI_PLAN_JSON_RETRY_SUFFIX = 'Return only valid JSON, no prose.'

export function lofiPlanRequest(
  input: LofiPlanInput & { vibe: string; targetDurationSec: number },
  retry: boolean,
): string {
  const system = lofiPlanSystemPrompt(input)
  const user = lofiPlanUserMessage(input.vibe, input.targetDurationSec)
  if (retry) {
    return `${system}\n\n${user}\n\n${LOFI_PLAN_JSON_RETRY_SUFFIX}`
  }
  return `${system}\n\n${user}`
}
