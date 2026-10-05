import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { StoredSceneRow } from '@/features/stories/server/stories-db'
import type { Run, TargetRef } from '@/shared/lib/video-processing/types'

import {
  STORY_EXPORT_MODEL_ID,
  type ExportSceneInput,
  buildExportTracksPayload,
  createStoryExportPlanner,
  createStoryExportSink,
  exportScenesFromRows,
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

const sceneRow = (over: Partial<StoredSceneRow> & { id: string }): StoredSceneRow => ({
  storyId: 's1',
  orderIndex: 0,
  imageUrl: 'https://cdn.test/a.png',
  voiceoverUrl: 'https://cdn.test/a.mp3',
  videoUrl: null,
  sentence: '',
  voiceoverText: '',
  action: '',
  setting: '',
  emotion: 'calm',
  imagePrompt: '',
  motionPrompt: null,
  characters: 1,
  props: '[]',
  voiceoverDuration: '2',
  voiceoverWordTimings: null,
  imageModel: null,
  videoModel: null,
  ...over,
})

describe('exportScenesFromRows', () => {
  it('prefers the animated video over the still image', () => {
    const built = exportScenesFromRows([
      sceneRow({ id: 'a', videoUrl: 'https://cdn.test/a.mp4' }),
      sceneRow({ id: 'b', orderIndex: 1 }),
    ])

    assert.deepEqual(built.map((s) => [s.visualUrl, s.isAnimated]), [
      ['https://cdn.test/a.mp4', true],
      ['https://cdn.test/a.png', false],
    ])
  })

  // Retry re-plans from the story, so a dropped scene would silently compose a
  // shorter video than the one the user asked for.
  it('names the scenes that are not ready instead of composing without them', () => {
    assert.throws(
      () =>
        exportScenesFromRows([
          sceneRow({ id: 'a' }),
          sceneRow({ id: 'b', orderIndex: 1, voiceoverUrl: null }),
          sceneRow({ id: 'c', orderIndex: 2, voiceoverDuration: null }),
        ]),
      /Scene 2, 3 are missing a visual, voiceover, or duration/,
    )
  })

  it('rejects a scene with neither a video nor an image', () => {
    assert.throws(
      () => exportScenesFromRows([sceneRow({ id: 'a', imageUrl: null })]),
      /Scene 1 is missing/,
    )
  })

  it('rejects a story with no scenes', () => {
    assert.throws(() => exportScenesFromRows([]), /no scenes to export/)
  })
})
