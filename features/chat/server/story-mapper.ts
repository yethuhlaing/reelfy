import type { Brief, ScenePlan } from '@/features/chat/pipelines/schemas'
import type { Pipeline } from '@/features/chat/pipelines/types'
import type { GenerateOptions, Scene, StoryData } from '@/shared/lib/types'

export function generateOptionsFromPipeline(pipeline: Pipeline): GenerateOptions {
  return {
    density: '12',
    style: 'expressive',
    tone: 'documentary',
    format: pipeline.id === 'animated-explainer' ? 'explainer' : 'narrative',
    imageModel: pipeline.defaults.imageModel as GenerateOptions['imageModel'],
    videoModel: (pipeline.defaults.videoModel ?? 'ltx-video-fal') as GenerateOptions['videoModel'],
    videoQuality: '720p',
    textModel: 'gpt-4o-mini',
  }
}

export function emptyStoryFromBrief(brief: Brief): StoryData {
  return {
    title: brief.title,
    tagline: brief.concept.slice(0, 120),
    protagonist: brief.title,
    thumbnailPrompt: null,
    thumbnailUrl: null,
    scenes: [],
  }
}

export function scenePlanToStoryData(plan: ScenePlan): StoryData {
  return {
    title: plan.title,
    tagline: plan.tagline,
    protagonist: plan.protagonist,
    thumbnailPrompt: plan.thumbnailPrompt,
    thumbnailUrl: null,
    scenes: plan.scenes.map(scenePlanToScene),
  }
}

export function scenePlanToScene(scene: ScenePlan['scenes'][number]): Scene {
  return {
    id: scene.id,
    sentence: scene.sentence,
    voiceover: scene.voiceoverText,
    action: scene.action,
    setting: scene.setting,
    emotion: 'neutral',
    characters: 1,
    props: [],
    imagePrompt: scene.imagePrompt,
    motionPrompt: scene.motionPrompt ?? undefined,
    imageUrl: null,
    voiceoverUrl: null,
    videoUrl: null,
  }
}

export function summarizePlan(plan: ScenePlan) {
  return {
    title: plan.title,
    sceneCount: plan.scenes.length,
    scenes: plan.scenes.map((s) => ({
      id: s.id,
      sentence: s.sentence,
      voiceoverText: s.voiceoverText,
    })),
  }
}
