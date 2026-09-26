import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { COMPOSE_MODEL_ID, SUBTITLE_MODEL_ID } from '@/features/brainrot/constants'
import type { BrainrotProject } from '@/shared/lib/types/brainrot'
import type { Run } from '@/shared/lib/video-processing/types'

import {
  brainrotTarget,
  createBrainrotExportPlanner,
  createBrainrotExportSink,
  orphanedRenderingStatus,
  phaseForRun,
  projectStatusForRun,
  resolveBrainrotExportChange,
  reusableAssets,
  toBrainrotExportHydration,
} from './brainrot-export'

const target = brainrotTarget('u1', 'p1')

const project = (over: Partial<BrainrotProject> = {}): BrainrotProject => ({
  id: 'p1',
  inputText: 'why cats win',
  title: 'Why cats win',
  script: 'Cats always win. Here is why.',
  format: 'facts',
  backgroundCategory: 'parkour',
  characterVoiceId: 'voice-1',
  captionPosition: 'bottom',
  voiceoverUrl: 'https://cdn.test/voice.mp3',
  voiceoverDurationSec: 42,
  voiceoverWordTimings: [{ word: 'Cats', startMs: 0, endMs: 300 }],
  backgroundVideoId: 'bg-1',
  chunkStartIndex: 3,
  chunkUrls: ['https://cdn.test/c0.mp4', 'https://cdn.test/c1.mp4'],
  outputVideoUrl: null,
  status: 'rendering',
  renderJobId: null,
  creditsCharged: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const options = (over: Partial<Parameters<typeof resolveBrainrotExportChange>[1]> = {}) => ({
  script: project().script,
  backgroundCategory: 'parkour',
  characterVoiceId: 'voice-1',
  captionPosition: 'bottom',
  ...over,
})

const run = (over: Partial<Run> = {}): Run => ({
  id: 'run-1',
  target,
  status: 'running',
  steps: [],
  creditsReserved: 0,
  creditsConsumed: 0,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const composeStep = (status: Run['steps'][number]['status']) => ({
  id: 'step-compose',
  kind: 'compose' as const,
  stage: 0,
  status,
  credits: 0,
  creditsConsumed: 0,
})

const subtitleStep = (status: Run['steps'][number]['status']) => ({
  id: 'step-subtitle',
  kind: 'subtitle' as const,
  stage: 1,
  status,
  credits: 0,
  creditsConsumed: 0,
})

describe('createBrainrotExportPlanner', () => {
  const plannerFor = (captionPosition: BrainrotProject['captionPosition'], credits = 0) =>
    createBrainrotExportPlanner({
      credits,
      loadCaptionPosition: async () => captionPosition,
      buildComposeInput: async () => ({ tracks: ['built'] }),
    })

  it('plans compose then subtitle as two stages of one Run', async () => {
    const plan = await plannerFor('bottom', 9).plan(target)

    assert.deepEqual(
      plan.steps.map((s) => [s.kind, s.stage, s.endpoint]),
      [
        ['compose', 0, COMPOSE_MODEL_ID],
        ['subtitle', 1, SUBTITLE_MODEL_ID],
      ],
    )
  })

  // One export, one charge. Pricing subtitle at zero is what makes a
  // subtitle-only retry free, since `retry` prices from the stored Steps.
  it('prices the whole export onto compose and the subtitle Step at nothing', async () => {
    const plan = await plannerFor('bottom', 9).plan(target)
    assert.equal(plan.steps[0].credits, 9)
    assert.equal(plan.steps[1].credits, 0)
  })

  it('captions the composed video the previous Step produced', async () => {
    const plan = await plannerFor('top').plan(target)
    const input = (await plan.steps[1].buildInput({
      run: run(),
      previousResultUrls: ['https://cdn.test/composed.mp4'],
    })) as Record<string, unknown>

    assert.equal(input.video_url, 'https://cdn.test/composed.mp4')
    assert.equal(input.position, 'top')
  })

  it('maps the middle caption position onto fal centre', async () => {
    const plan = await plannerFor('middle').plan(target)
    const input = (await plan.steps[1].buildInput({
      run: run(),
      previousResultUrls: ['https://cdn.test/composed.mp4'],
    })) as Record<string, unknown>

    assert.equal(input.position, 'center')
  })

  it('refuses to subtitle nothing rather than submitting an empty video URL', async () => {
    const plan = await plannerFor('bottom').plan(target)
    await assert.rejects(
      async () => plan.steps[1].buildInput({ run: run(), previousResultUrls: [] }),
      /no composed video to caption/,
    )
  })

  it('rejects a Target that is not a brainrot project', async () => {
    await assert.rejects(
      async () =>
        plannerFor('bottom').plan({ kind: 'story', userId: 'u1', storyId: 's1' }),
      /received a story Target/,
    )
  })
})

describe('reusableAssets', () => {
  it('offers the stored voiceover and chunks back to the planner', () => {
    assert.deepEqual(reusableAssets(project()), {
      voiceoverUrl: 'https://cdn.test/voice.mp3',
      voiceoverDurationSec: 42,
      wordTimings: [{ word: 'Cats', startMs: 0, endMs: 300 }],
      backgroundVideoId: 'bg-1',
      chunkStartIndex: 3,
      chunkUrls: ['https://cdn.test/c0.mp4', 'https://cdn.test/c1.mp4'],
    })
  })

  it('offers nothing when the voiceover was cleared', () => {
    assert.equal(reusableAssets(project({ voiceoverUrl: null })), null)
  })

  it('offers nothing without word timings to caption against', () => {
    assert.equal(reusableAssets(project({ voiceoverWordTimings: [] })), null)
  })
})

describe('resolveBrainrotExportChange', () => {
  it('keeps the paid-for voiceover and charges nothing to move the captions', () => {
    const change = resolveBrainrotExportChange(project(), options({ captionPosition: 'top' }))
    assert.deepEqual(change, {
      clearVoiceover: false,
      clearChunks: false,
      captionOnly: true,
      credits: 0,
    })
  })

  it('throws the voiceover away when the script changed', () => {
    const change = resolveBrainrotExportChange(project(), options({ script: 'A new script' }))
    assert.equal(change.clearVoiceover, true)
    assert.equal(change.clearChunks, true)
    assert.equal(change.captionOnly, false)
    assert.ok(change.credits > 0)
  })

  it('throws the voiceover away when the voice changed', () => {
    const change = resolveBrainrotExportChange(project(), options({ characterVoiceId: 'voice-2' }))
    assert.equal(change.clearVoiceover, true)
    assert.equal(change.clearChunks, true)
  })

  it('keeps the voiceover but repicks gameplay when only the category changed', () => {
    const change = resolveBrainrotExportChange(
      project(),
      options({ backgroundCategory: 'minecraft' }),
    )
    assert.equal(change.clearVoiceover, false)
    assert.equal(change.clearChunks, true)
    assert.equal(change.captionOnly, false)
  })

  // Free means "already paid for". A project with nothing stored has not.
  it('charges for a caption move when there is no stored voiceover to reuse', () => {
    const change = resolveBrainrotExportChange(
      project({ voiceoverUrl: null, chunkUrls: null }),
      options({ captionPosition: 'top' }),
    )
    assert.equal(change.captionOnly, false)
    assert.ok(change.credits > 0)
  })
})

describe('createBrainrotExportSink', () => {
  it('writes the captioned reel onto the project', async () => {
    const writes: Array<{ projectId: string; userId: string; patch: unknown }> = []
    const sink = createBrainrotExportSink(async (projectId, userId, patch) => {
      writes.push({ projectId, userId, patch })
      return project()
    })

    await sink.apply({
      target,
      run: run(),
      videoUrl: 'https://cdn.test/captioned.mp4',
    })

    assert.deepEqual(writes, [
      {
        projectId: 'p1',
        userId: 'u1',
        patch: { outputVideoUrl: 'https://cdn.test/captioned.mp4', status: 'complete' },
      },
    ])
  })

  it('fails the Run rather than reporting a reel the project never got', async () => {
    const sink = createBrainrotExportSink(async () => null)
    await assert.rejects(
      async () => sink.apply({ target, run: run(), videoUrl: 'https://cdn.test/x.mp4' }),
      /Failed to persist the brainrot output URL/,
    )
  })
})

describe('phaseForRun', () => {
  it('reads composing while the first Step is still out at fal', () => {
    assert.equal(
      phaseForRun(run({ steps: [composeStep('running'), subtitleStep('pending')] })),
      'composing',
    )
  })

  it('reads subtitling once compose is done', () => {
    assert.equal(
      phaseForRun(run({ steps: [composeStep('completed'), subtitleStep('running')] })),
      'subtitling',
    )
  })

  // A terminal Run must never render as loading.
  it('has no phase once the Run is terminal', () => {
    assert.equal(
      phaseForRun(
        run({ status: 'completed', steps: [composeStep('completed'), subtitleStep('completed')] }),
      ),
      null,
    )
  })
})

describe('projectStatusForRun', () => {
  it('mirrors an in-flight Run as rendering', () => {
    assert.equal(projectStatusForRun(run(), project()), 'rendering')
  })

  it('mirrors a completed Run as complete', () => {
    assert.equal(projectStatusForRun(run({ status: 'completed' }), project()), 'complete')
  })

  it('mirrors a failed Run as failed, so no card sits on Rendering forever', () => {
    assert.equal(projectStatusForRun(run({ status: 'failed' }), project()), 'failed')
  })

  it('returns an aborted Run to the draft it came from', () => {
    assert.equal(projectStatusForRun(run({ status: 'aborted' }), project()), 'script_ready')
    assert.equal(
      projectStatusForRun(run({ status: 'aborted' }), project({ script: '' })),
      'draft',
    )
  })
})

describe('toBrainrotExportHydration', () => {
  it('hydrates an in-flight Run with the phase the user is waiting on', () => {
    assert.deepEqual(
      toBrainrotExportHydration(
        run({ steps: [composeStep('completed'), subtitleStep('running')] }),
      ),
      { runId: 'run-1', status: 'running', phase: 'subtitling', error: undefined },
    )
  })

  it('hydrates a failed Run with its error and whether retry is worth offering', () => {
    assert.deepEqual(
      toBrainrotExportHydration(
        run({ status: 'failed', error: 'subtitle broke', retryable: true }),
      ),
      {
        runId: 'run-1',
        status: 'failed',
        phase: null,
        error: 'subtitle broke',
        retryable: true,
      },
    )
  })

  // The page reads `outputVideoUrl` for a finished reel; a completed Run is
  // not something the overlay should ever re-render from.
  it('hydrates nothing for a completed Run', () => {
    assert.equal(toBrainrotExportHydration(run({ status: 'completed' })), null)
  })

  it('hydrates an aborted Run as idle', () => {
    assert.deepEqual(toBrainrotExportHydration(run({ status: 'aborted' })), {
      runId: 'run-1',
      status: 'aborted',
      phase: null,
    })
  })
})

describe('orphanedRenderingStatus', () => {
  // The overlay must not spin forever on a dead socket: a project that claims
  // to be rendering with no Run behind it has nothing that will ever finish it.
  it('settles a rendering project that has no Run as failed', () => {
    assert.equal(orphanedRenderingStatus(project({ status: 'rendering' }), null), 'failed')
  })

  it('settles it as complete when the reel is in fact already there', () => {
    assert.equal(
      orphanedRenderingStatus(
        project({ status: 'rendering', outputVideoUrl: 'https://cdn.test/out.mp4' }),
        null,
      ),
      'complete',
    )
  })

  it('leaves a project with a live Run alone', () => {
    assert.equal(orphanedRenderingStatus(project({ status: 'rendering' }), run()), null)
  })

  it('leaves a project that never claimed to be rendering alone', () => {
    assert.equal(orphanedRenderingStatus(project({ status: 'script_ready' }), null), null)
  })
})
