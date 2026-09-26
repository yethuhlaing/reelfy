/**
 * Animate planner and scene sink. Loaders and persist are injected so tests
 * can exercise the mapping without Postgres or fal.
 */

import type { VideoQuality } from '@/shared/lib/types'
import type { ResultSink, RunPlanner, TargetRef } from '@/shared/lib/video-processing/types'

export type SceneTarget = Extract<TargetRef, { kind: 'scene' }>

export interface AnimateSceneSnapshot {
  imageUrl: string | null
  motionPrompt?: string | null
  videoModel?: string | null
}

export interface AnimateStorySnapshot {
  videoModel?: string | null
  videoQuality?: string | null
}

export interface AnimateVideoProvider {
  falModel: string
  credits: number
  queueInput(
    imageUrl: string,
    prompt: string,
    opts: { numFrames: number; fps: number; width: number; height: number },
  ): Record<string, unknown>
}

export function createAnimatePlanner(deps: {
  load: (
    target: SceneTarget,
  ) => Promise<{ scene: AnimateSceneSnapshot; story: AnimateStorySnapshot } | null>
  resolveProvider: (model: string | undefined) => AnimateVideoProvider
}): RunPlanner {
  return {
    async plan(target) {
      if (target.kind !== 'scene') {
        throw new Error(`Animate planner does not handle Target kind ${target.kind}`)
      }

      const loaded = await deps.load(target)
      if (!loaded) throw new Error('Scene not found')

      const imageUrl = loaded.scene.imageUrl
      const motionPrompt = loaded.scene.motionPrompt?.trim()
      if (!imageUrl) throw new Error('Generate an image first')
      if (!motionPrompt) throw new Error('Add a motion prompt')

      const videoModel = loaded.story.videoModel ?? loaded.scene.videoModel ?? undefined
      const videoQuality = (loaded.story.videoQuality ?? '720p') as VideoQuality
      const provider = deps.resolveProvider(videoModel)
      const dims =
        videoQuality === '1080p'
          ? { width: 1920, height: 1080 }
          : { width: 1280, height: 720 }

      return {
        steps: [
          {
            kind: 'animate' as const,
            stage: 0,
            endpoint: provider.falModel,
            credits: provider.credits,
            buildInput: () =>
              provider.queueInput(imageUrl, motionPrompt, {
                numFrames: 121,
                fps: 24,
                ...dims,
              }),
          },
        ],
      }
    },
  }
}

export function createSceneResultSink(
  persist: (storyId: string, sceneId: string, userId: string, videoUrl: string) => Promise<boolean>,
): ResultSink {
  return {
    async apply({ target, videoUrl }) {
      if (target.kind !== 'scene') {
        throw new Error(`Scene sink does not handle Target kind ${target.kind}`)
      }
      const ok = await persist(target.storyId, target.sceneId, target.userId, videoUrl)
      if (!ok) throw new Error('Failed to persist scene video URL')
    },
  }
}
