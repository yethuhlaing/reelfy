import type { Pipeline } from './types'
import { scenePlanSchema } from './schemas'

export const animatedExplainer: Pipeline = {
  id: 'animated-explainer',
  label: 'Animated Explainer',
  description: 'Clear, info-dense explainer with crisp visuals.',
  storyCategory: 'animated-explainer',
  defaults: {
    textModel: 'gpt-4o-mini',
    imageModel: 'flux-schnell-fal',
    videoModel: 'ltx-video-fal',
    musicModel: 'stable-audio',
  },
  stages: [
    {
      id: 'plan',
      gate: 'none',
      tools: [],
      outputSchema: scenePlanSchema,
      systemPrompt: `You are the plan director for an animated explainer. Given the brief,
write a scene-by-scene plan with clear teaching beats, simple visual metaphors,
and concise narration. Output must satisfy the scenePlan schema exactly.`,
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
