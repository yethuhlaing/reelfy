import type { Pipeline } from './types'
import { scenePlanSchema } from './schemas'

export const cinematic: Pipeline = {
  id: 'cinematic',
  label: 'Cinematic',
  description: 'Image-led cinematic short with narration.',
  storyCategory: 'cinematic',
  defaults: {
    textModel: 'gpt-4o-mini',
    imageModel: 'flux-dev-fal',
    videoModel: 'ltx-video-fal',
    musicModel: 'stable-audio',
  },
  stages: [
    {
      id: 'plan',
      gate: 'none',
      tools: [],
      outputSchema: scenePlanSchema,
      systemPrompt: `You are the plan director for a cinematic short. Given the brief,
write a scene-by-scene plan: vivid image prompts (cinematic lighting, lens,
composition), narration per scene, and motion prompts. Keep to the target
duration. Output must satisfy the scenePlan schema exactly.`,
    },
    {
      id: 'assets',
      gate: 'before',
      tools: ['generate_image', 'generate_voice'],
      systemPrompt: `Generate assets for each planned scene using the provided tools.`,
    },
    {
      id: 'compose',
      gate: 'none',
      tools: ['compose_video'],
      systemPrompt: `Assemble the final video from generated assets and persist it.`,
    },
  ],
}
