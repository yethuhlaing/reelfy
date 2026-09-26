import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits } from '@/shared/lib/db/credits'
import { getGameplayCategory } from '@/shared/data/gameplay-catalog'
import { isCuratedBrainrotVoice } from '@/shared/data/brainrot-voices'
import {
  getBrainrotProjectForUser,
  updateBrainrotProject,
} from '@/features/brainrot/server/brainrot-db'
import {
  brainrotTarget,
  createBrainrotExportKernel,
  resolveBrainrotExportChange,
} from '@/features/brainrot/server/brainrot-export'
import { InsufficientCreditsError } from '@/shared/lib/video-processing/errors'
import { isInFlight } from '@/shared/lib/video-processing/types'
import type { BrainrotCaptionPosition } from '@/shared/lib/types/brainrot'

export const runtime = 'nodejs'
export const maxDuration = 120

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function insufficient(balance: number, required: number) {
  return new Response(
    JSON.stringify({ error: 'insufficient_credits', balance, required }),
    { status: 402 },
  )
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { projectId, script, backgroundCategory, characterVoiceId, captionPosition } = body as {
    projectId?: string
    script?: string
    backgroundCategory?: string
    characterVoiceId?: string
    captionPosition?: string
  }

  if (!projectId) return badRequest('Missing projectId')
  if (!script?.trim()) return badRequest('Missing script')
  if (!backgroundCategory || !getGameplayCategory(backgroundCategory)) {
    return badRequest('Invalid background category')
  }
  if (!characterVoiceId || !isCuratedBrainrotVoice(characterVoiceId)) {
    return badRequest('Invalid character voice')
  }
  if (!captionPosition || !['top', 'middle', 'bottom'].includes(captionPosition)) {
    return badRequest('Invalid caption position')
  }

  const project = await getBrainrotProjectForUser(projectId, userId)
  if (!project) return badRequest('Project not found')

  const target = brainrotTarget(userId, projectId)
  const next = {
    script: script.trim(),
    backgroundCategory,
    characterVoiceId,
    captionPosition,
  }
  const change = resolveBrainrotExportChange(project, next)
  const kernel = createBrainrotExportKernel({ credits: change.credits })

  // A second Export while one is in flight joins it: no second compose, no
  // second charge, and the first fal request is left alone. This runs before
  // anything is written, so it cannot disturb the export already going.
  const current = await kernel.get(target).catch(() => null)
  if (current && isInFlight(current)) {
    return Response.json({
      projectId,
      runId: current.id,
      status: current.status,
      balance: await getCredits(userId),
    })
  }

  const balance = await getCredits(userId)
  if (balance < change.credits) return insufficient(balance, change.credits)

  // Persist the options first: the planner reads the project, and only reuses
  // the stored voiceover and chunks this write leaves behind.
  await updateBrainrotProject(projectId, userId, {
    script: next.script,
    backgroundCategory,
    characterVoiceId,
    captionPosition: captionPosition as BrainrotCaptionPosition,
    outputVideoUrl: null,
    status: 'rendering',
    creditsCharged: project.creditsCharged + change.credits,
    ...(change.clearVoiceover
      ? { voiceoverUrl: null, voiceoverDurationSec: null, voiceoverWordTimings: null }
      : {}),
    ...(change.clearChunks
      ? { backgroundVideoId: null, chunkStartIndex: null, chunkUrls: null }
      : {}),
  })

  try {
    const run = await kernel.start(target)
    return Response.json({
      projectId,
      runId: run.id,
      status: run.status,
      error: run.error,
      balance: await getCredits(userId),
    })
  } catch (err) {
    await updateBrainrotProject(projectId, userId, {
      status: 'failed',
      creditsCharged: project.creditsCharged,
    }).catch(() => {})
    if (err instanceof InsufficientCreditsError) {
      return insufficient(err.balance, err.required)
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Export failed' }),
      { status: 500 },
    )
  }
}
