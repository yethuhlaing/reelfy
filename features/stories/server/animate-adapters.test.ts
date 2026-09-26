import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { TargetRef } from '@/shared/lib/video-processing/types'

import {
  createAnimatePlanner,
  createSceneResultSink,
  type AnimateVideoProvider,
} from './animate-adapters'

const target: TargetRef = {
  kind: 'scene',
  userId: 'u1',
  storyId: 's1',
  sceneId: 'sc1',
}

const provider: AnimateVideoProvider = {
  falModel: 'fal-ai/ltx-video/image-to-video',
  credits: 9,
  queueInput: (imageUrl, prompt, opts) => ({
    image_url: imageUrl,
    prompt,
    ...opts,
  }),
}

describe('createAnimatePlanner', () => {
  it('plans one animate Step from the scene still and story video model', async () => {
    const planner = createAnimatePlanner({
      load: async () => ({
        scene: {
          imageUrl: 'https://cdn.test/still.png',
          motionPrompt: 'slow push in',
        },
        story: { videoModel: 'ltx-video-fal', videoQuality: '720p' },
      }),
      resolveProvider: () => provider,
    })

    const plan = await planner.plan(target)

    assert.equal(plan.steps.length, 1)
    assert.equal(plan.steps[0].kind, 'animate')
    assert.equal(plan.steps[0].endpoint, 'fal-ai/ltx-video/image-to-video')
    assert.equal(plan.steps[0].credits, 9)
    assert.deepEqual(
      await plan.steps[0].buildInput({
        run: {
          id: 'run-1',
          target,
          status: 'pending',
          steps: [],
          creditsReserved: 0,
          creditsConsumed: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        previousResultUrls: [],
      }),
      {
        image_url: 'https://cdn.test/still.png',
        prompt: 'slow push in',
        numFrames: 121,
        fps: 24,
        width: 1280,
        height: 720,
      },
    )
  })

  it('refuses a Target with no still to animate', async () => {
    const planner = createAnimatePlanner({
      load: async () => ({
        scene: { imageUrl: null, motionPrompt: 'move' },
        story: {},
      }),
      resolveProvider: () => provider,
    })

    await assert.rejects(() => planner.plan(target), /Generate an image first/)
  })
})

describe('createSceneResultSink', () => {
  it('writes the given URL onto the scene Target', async () => {
    const writes: Array<{ storyId: string; sceneId: string; userId: string; videoUrl: string }> = []
    const sink = createSceneResultSink(async (storyId, sceneId, userId, videoUrl) => {
      writes.push({ storyId, sceneId, userId, videoUrl })
      return true
    })

    await sink.apply({
      target,
      run: {
        id: 'run-1',
        target,
        status: 'running',
        steps: [],
        creditsReserved: 0,
        creditsConsumed: 0,
        createdAt: 1,
        updatedAt: 1,
      },
      videoUrl: 'https://cdn.test/clip.mp4',
    })

    assert.deepEqual(writes, [
      { storyId: 's1', sceneId: 'sc1', userId: 'u1', videoUrl: 'https://cdn.test/clip.mp4' },
    ])
  })
})
