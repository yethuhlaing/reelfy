import { after } from 'next/server'
import { readFalHeaders, verifyFalWebhook } from '@/shared/lib/jobs/verify-fal'
import { createAnimateKernel } from '@/features/stories/server/animate-kernel'
import { createStoryExportKernel } from '@/features/stories/server/story-export'
import { createPgRunStore } from '@/shared/lib/video-processing/run-store-pg'
import type { VideoKernel } from '@/shared/lib/video-processing/kernel'
import type { FalWebhookBody } from '@/shared/lib/video-processing/types'

export const runtime = 'nodejs'
export const maxDuration = 60

function kernelForTarget(kind: string): VideoKernel {
  if (kind === 'scene') return createAnimateKernel()
  if (kind === 'story') return createStoryExportKernel()
  throw new Error(`No kernel for Target kind ${kind}`)
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ runId: string; stepId: string }> },
) {
  const { runId, stepId } = await ctx.params
  if (!runId || !stepId) return new Response('Missing run or step', { status: 400 })

  const headers = readFalHeaders(req)
  if (!headers) return new Response('Missing signature headers', { status: 401 })

  const raw = await req.arrayBuffer()
  const valid = await verifyFalWebhook(headers, raw).catch(() => false)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const text = new TextDecoder().decode(raw)
  let body: FalWebhookBody
  try {
    body = JSON.parse(text) as FalWebhookBody
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const existing = await createPgRunStore().findById(runId)
  if (!existing) return new Response('ok')

  // fal's first-attempt timeout is 15s. Download + R2 must not block the ack.
  // Duplicate deliveries are no-ops once the Step is terminal. If this
  // background run dies, the next GET / poll reconciles against fal.
  after(async () => {
    try {
      await kernelForTarget(existing.target.kind).onWebhook({ runId, stepId, body })
    } catch (err) {
      console.error('Video processing webhook failed', err)
    }
  })

  return new Response('ok')
}
