import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { getCredits, deductCredits } from '@/shared/lib/db/credits'
import { createJob, markFailed, markRunning } from '@/shared/lib/jobs/store'
import { buildWebhookUrl } from '@/shared/lib/jobs/webhook-url'
import { getGameplayCategory } from '@/shared/data/gameplay-catalog'
import { isCuratedBrainrotVoice } from '@/shared/data/brainrot-voices'
import {
  getBrainrotProjectForUser,
  updateBrainrotProject,
} from '@/features/brainrot/server/brainrot-db'
import {
  prepareBrainrotExportAssets,
  submitBrainrotCompose,
} from '@/features/brainrot/server/export-pipeline'
import { BRAINROT_EXPORT_CREDITS, COMPOSE_MODEL_ID } from '@/features/brainrot/constants'
import type { BrainrotCaptionPosition, BrainrotFormat } from '@/shared/lib/types/brainrot'
import type { BrainrotExportPayload } from '@/shared/lib/jobs/types'
import type { WordTiming } from '@/shared/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

function isCaptionOnlyReexport(
  existing: {
    script: string
    backgroundCategory: string
    characterVoiceId: string
    captionPosition: string
    voiceoverUrl: string | null
    voiceoverWordTimings: WordTiming[] | null
    voiceoverDurationSec: number | null
    backgroundVideoId: string | null
    chunkStartIndex: number | null
    chunkUrls: string[] | null
  },
  next: {
    script: string
    backgroundCategory: string
    characterVoiceId: string
    captionPosition: string
  },
): boolean {
  return (
    existing.script === next.script &&
    existing.backgroundCategory === next.backgroundCategory &&
    existing.characterVoiceId === next.characterVoiceId &&
    existing.captionPosition !== next.captionPosition &&
    !!existing.voiceoverUrl &&
    !!existing.voiceoverWordTimings?.length &&
    existing.voiceoverDurationSec != null &&
    !!existing.chunkUrls?.length
  )
}

export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const {
    projectId,
    script,
    backgroundCategory,
    characterVoiceId,
    captionPosition,
  } = body as {
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

  const trimmedScript = script.trim()
  const position = captionPosition as BrainrotCaptionPosition
  const captionOnly = isCaptionOnlyReexport(project, {
    script: trimmedScript,
    backgroundCategory,
    characterVoiceId,
    captionPosition,
  })

  const creditsToCharge = captionOnly ? 0 : BRAINROT_EXPORT_CREDITS
  let balance = await getCredits(userId)
  let jobId: string | null = null

  if (creditsToCharge > 0) {
    if (balance < creditsToCharge) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          balance,
          required: creditsToCharge,
        }),
        { status: 402 },
      )
    }
    const charge = await deductCredits(userId, creditsToCharge)
    if (!charge.ok) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          balance: charge.balance,
          required: creditsToCharge,
        }),
        { status: 402 },
      )
    }
    balance = charge.balance
  }

  try {
    const reuseVoiceover = captionOnly
      ? {
          voiceoverUrl: project.voiceoverUrl!,
          voiceoverDurationSec: project.voiceoverDurationSec!,
          wordTimings: project.voiceoverWordTimings!,
          backgroundVideoId: project.backgroundVideoId,
          chunkStartIndex: project.chunkStartIndex,
          chunkUrls: project.chunkUrls,
        }
      : null

    const assets = await prepareBrainrotExportAssets({
      projectId,
      script: trimmedScript,
      backgroundCategory,
      characterVoiceId,
      userId,
      reuseVoiceover,
      signal: request.signal,
    })

    await updateBrainrotProject(projectId, userId, {
      script: trimmedScript,
      backgroundCategory,
      characterVoiceId,
      captionPosition: position,
      format: project.format as BrainrotFormat,
      voiceoverUrl: assets.voiceoverUrl,
      voiceoverDurationSec: assets.voiceoverDurationSec,
      voiceoverWordTimings: assets.wordTimings,
      backgroundVideoId: assets.backgroundVideoId,
      chunkStartIndex: assets.chunkStartIndex,
      chunkUrls: assets.chunkUrls,
      outputVideoUrl: null,
      status: 'rendering',
      creditsCharged: project.creditsCharged + creditsToCharge,
    })

    const payload: BrainrotExportPayload = {
      projectId,
      userId,
      captionPosition: position,
      phase: 'compose',
    }
    const job = await createJob<BrainrotExportPayload>('brainrot-export', payload)
    jobId = job.id
    // Persist so a stuck 'rendering' project can be reconciled server-side later
    // (dev has no public webhook URL, so the completion callback never arrives).
    await updateBrainrotProject(projectId, userId, { renderJobId: job.id })

    const composeRequestId = await submitBrainrotCompose({
      tracks: assets.tracks,
      webhookUrl: buildWebhookUrl('brainrot/export', job.id),
    })
    await markRunning(job.id, composeRequestId, COMPOSE_MODEL_ID)

    return Response.json({ projectId, jobId: job.id, balance })
  } catch (err) {
    if (creditsToCharge > 0) {
      await deductCredits(userId, -creditsToCharge)
    }
    if (jobId) await markFailed(jobId, err instanceof Error ? err.message : 'Export failed')
    await updateBrainrotProject(projectId, userId, { status: 'failed' })
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Export failed' }),
      { status: 500 },
    )
  }
}
