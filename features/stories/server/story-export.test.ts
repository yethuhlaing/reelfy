import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ExportSceneInput } from '@/shared/lib/jobs/types'
import type { Run, TargetRef } from '@/shared/lib/video-processing/types'

import {
  STORY_EXPORT_MODEL_ID,
  buildExportTracksPayload,
  createStoryExportPlanner,
  createStoryExportSink,
} from './story-export'

const story: TargetRef = { kind: 'story', userId: 'u1', storyId: 's1' }

const scenes: ExportSceneInput[] = [
  {
    sceneId: 'a',
    visualUrl: 'https://cdn.test/a.mp4',
    isAnimated: true,
    voiceoverUrl: 'https://cdn.test/a.mp3',
    duration: 2,
  },
  {
    sceneId: 'b',
    visualUrl: 'https://cdn.test/b.png',
    isAnimated: false,
    voiceoverUrl: 'https://cdn.test/b.mp3',
    duration: 1.5,
  },
]

const emptyRun: Run = {
  id: 'run-1',
  target: story,
  status: 'pending',
  steps: [],
  creditsReserved: 0,
  creditsConsumed: 0,
  createdAt: 1,
  updatedAt: 1,
}

describe('buildExportTracksPayload', () => {
  it('lays video and audio keyframes end to end', () => {
    const tracks = buildExportTracksPayload(scenes)
    assert.equal(tracks[0].type, 'video')
    assert.equal(tracks[0].keyframes[0].timestamp, 0)
    assert.equal(tracks[0].keyframes[0].duration, 2000)
    assert.equal(tracks[0].keyframes[1].timestamp, 2000)
    assert.equal(tracks[0].keyframes[1].duration, 1500)
    assert.equal(tracks[1].type, 'audio')
    assert.equal(tracks[1].keyframes[1].url, 'https://cdn.test/b.mp3')
  })
})

describe('createStoryExportPlanner', () => {
  it('plans one compose Step from the provided scenes', async () => {
    const planner = createStoryExportPlanner({ scenes })
    const plan = await planner.plan(story)

    assert.equal(plan.steps.length, 1)
    assert.equal(plan.steps[0].kind, 'compose')
    assert.equal(plan.steps[0].endpoint, STORY_EXPORT_MODEL_ID)
    assert.deepEqual(await plan.steps[0].buildInput({ run: emptyRun, previousResultUrls: [] }), {
      tracks: buildExportTracksPayload(scenes),
    })
  })
})

describe('createStoryExportSink', () => {
  it('writes the given URL onto the story Target', async () => {
    const writes: Array<{ storyId: string; userId: string; videoUrl: string }> = []
    const sink = createStoryExportSink(async (storyId, userId, videoUrl) => {
      writes.push({ storyId, userId, videoUrl })
      return true
    })

    await sink.apply({
      target: story,
      run: emptyRun,
      videoUrl: 'https://cdn.test/composed.mp4',
    })

    assert.deepEqual(writes, [
      { storyId: 's1', userId: 'u1', videoUrl: 'https://cdn.test/composed.mp4' },
    ])
  })
})
