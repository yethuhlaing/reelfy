import { z } from 'zod'

export const briefSchema = z.object({
  pipeline: z.string(),
  concept: z.string(),
  title: z.string(),
  format: z.enum(['narrative', 'explainer', 'listicle']),
  durationSec: z.number().int().min(15).max(180),
  visualApproach: z.string(),
})

export const sceneSchema = z.object({
  id: z.string(),
  sentence: z.string(),
  voiceoverText: z.string(),
  imagePrompt: z.string(),
  motionPrompt: z.string().nullable(),
  action: z.string(),
  setting: z.string(),
  emotion: z.string(),
})

export const scenePlanSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  protagonist: z.string(),
  thumbnailPrompt: z.string(),
  scenes: z.array(sceneSchema).min(3).max(20),
})

export type Brief = z.infer<typeof briefSchema>
export type ChatScene = z.infer<typeof sceneSchema>
export type ScenePlan = z.infer<typeof scenePlanSchema>
