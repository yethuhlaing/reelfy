import { readFalHeaders, verifyFalWebhook } from '@/shared/lib/jobs/verify-fal'
import { handleRenderWebhook } from '@/features/lofi/server/lofi-orchestrator'
import type { FalWebhookPayload } from '@/features/lofi/server/lofi-orchestrator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  req: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params
  if (!videoId) return new Response('Missing videoId', { status: 400 })

  const headers = readFalHeaders(req)
  if (!headers) return new Response('Missing signature headers', { status: 401 })

  const raw = await req.arrayBuffer()
  const valid = await verifyFalWebhook(headers, raw).catch(() => false)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const text = new TextDecoder().decode(raw)
  let body: FalWebhookPayload
  try {
    body = JSON.parse(text) as FalWebhookPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  try {
    await handleRenderWebhook(videoId, body)
  } catch (err) {
    console.error('lofi-render webhook failed', err)
  }

  return new Response('ok')
}
