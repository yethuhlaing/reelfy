import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Scene } from '@/shared/lib/types'
import type { Run } from '@/shared/lib/video-processing/types'

import { applyAnimateRunToScene } from './animate-run'

const scene: Scene = {
  id: 'sc1',
  sentence: 'A still',
  voiceover: '',
  action: '',
  setting: '',
  emotion: 'neutral',
  characters: 1,
  props: [],
  imagePrompt: 'a still',
  motionPrompt: 'camera push',
  imageUrl: 'https://cdn.test/still.png',
  voiceoverUrl: null,
  videoUrl: null,
}

function run(patch: Partial<Run> & Pick<Run, 'status'>): Run {
  return {
    id: 'run-1',
    target: { kind: 'scene', userId: 'u1', storyId: 's1', sceneId: 'sc1' },
    steps: [
      {
        id: 'step-1',
        kind: 'animate',
        stage: 0,
        status: patch.status === 'running' || patch.status === 'pending' ? 'running' : 'pending',
        credits: 0,
        creditsConsumed: 0,
      },
    ],
    creditsReserved: 0,
    creditsConsumed: 0,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...patch,
  }
}

describe('applyAnimateRunToScene', () => {
  it('hydrates an in-flight Run as animating, not a tab-only pending id', () => {
    const hydrated = applyAnimateRunToScene(scene, run({ status: 'running' }))

    assert.equal(hydrated.pendingRunId, 'run-1')
    assert.equal(hydrated.lastError, undefined)
    assert.equal(hydrated.runCreatedAt, 1_700_000_000_000)
    assert.equal(hydrated.videoUrl, null)
  })

  it('keeps Retry available after a failed Run is reloaded', () => {
    const hydrated = applyAnimateRunToScene(
      scene,
      run({ status: 'failed', error: 'fal is down', retryable: true }),
    )

    assert.equal(hydrated.pendingRunId, undefined)
    assert.equal(hydrated.lastError, 'fal is down')
  })

  it('shows the clip when a completed Run is read after a missed webhook', () => {
    const hydrated = applyAnimateRunToScene(
      scene,
      run({
        status: 'completed',
        steps: [
          {
            id: 'step-1',
            kind: 'animate',
            stage: 0,
            status: 'completed',
            resultUrl: 'https://cdn.test/clip.mp4',
            credits: 0,
            creditsConsumed: 0,
          },
        ],
      }),
    )

    assert.equal(hydrated.pendingRunId, undefined)
    assert.equal(hydrated.lastError, undefined)
    assert.equal(hydrated.videoUrl, 'https://cdn.test/clip.mp4')
  })

  it('does not apply a video after cancel', () => {
    const hydrated = applyAnimateRunToScene(
      { ...scene, videoUrl: 'https://cdn.test/old.mp4' },
      run({ status: 'aborted' }),
    )

    assert.equal(hydrated.pendingRunId, undefined)
    assert.equal(hydrated.lastError, undefined)
    assert.equal(hydrated.videoUrl, 'https://cdn.test/old.mp4')
  })

  it('clears tab-only fields when the Target has no Run', () => {
    const hydrated = applyAnimateRunToScene(
      { ...scene, pendingRunId: 'stale', lastError: 'stale', runCreatedAt: 1 },
      null,
    )

    assert.equal(hydrated.pendingRunId, undefined)
    assert.equal(hydrated.lastError, undefined)
    assert.equal(hydrated.runCreatedAt, undefined)
  })
})
