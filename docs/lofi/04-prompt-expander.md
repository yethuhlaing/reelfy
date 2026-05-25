# 04 — Prompt Expander (Vibe → Prompts)

User enters a single vibe string. Gemini expands it into:
- N music prompts (one per loop)
- K visual prompts (one per visual asset)

User reviews + edits the list before confirming. Reuses existing `@google/generative-ai` integration at [shared/lib/integrations/gemini.ts](../../shared/lib/integrations/gemini.ts).

## API route

`POST /api/lofi/expand-prompts`

### Request
```ts
{
  vibe: string                  // "rainy tokyo cafe at midnight"
  musicLoopCount: number        // 20
  visualMode: VisualMode
  visualAssetCount: number      // 1 for single-*, 2-12 for multi-*
}
```

### Response
```ts
{
  musicPrompts: string[]        // length === musicLoopCount
  visualPrompts: string[]       // length === visualAssetCount
  suggestedTitle: string        // for stories.title mirror
  suggestedAmbientBed: 'rain' | 'vinyl' | 'fireplace' | 'cafe' | null
}
```

## Gemini system prompt (sketch)

```
You generate prompt sets for AI-generated lofi YouTube videos. Given a single vibe phrase, return JSON with:
- musicPrompts: array of N short prompts for instrumental lofi music. Each prompt should describe a slight variation of the same mood (different instrument focus, energy level, tempo subtly different). All should fit together as one cohesive listening session.
- visualPrompts: array of K prompts for the same scene from slightly different angles/times-of-day/details. Cohesive, not jarring transitions.
- suggestedTitle: a short YouTube-style title (≤60 chars).
- suggestedAmbientBed: pick best fit from rain/vinyl/fireplace/cafe based on the vibe, or null if none fit.

Return strict JSON, no markdown.
```

## Editable preview flow

```
1. User fills vibe + counts + mode  →  POST /api/lofi/expand-prompts
2. Form replaces "expand" button with editable list of prompts (one textarea per row)
3. User can:
   - edit any prompt
   - regenerate single prompt (calls expand-prompts with count=1, single-slot)
   - regenerate all (re-POST expand-prompts)
   - reorder (drag-drop, sets orderIndex)
4. Confirm  →  POST /api/lofi/generate (stage 2 launch)
```

## Validation
- All prompts non-empty after edit
- Length caps (≤500 chars per prompt to keep within fal token limits)
- Profanity / NSFW filter optional (skip MVP)

## Failure mode

Gemini occasionally returns malformed JSON. Wrapper:
- Validate against zod schema
- If invalid, retry once with stricter instruction "Return only valid JSON, no prose."
- After 2 failures, return error to client — user can manually fill all prompts

## Cost

Gemini call ~$0.001 per expand. Not metered to user credits MVP (absorbed). If abuse seen, add 1-credit charge per expand.
