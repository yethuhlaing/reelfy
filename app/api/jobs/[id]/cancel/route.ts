import { fal } from '@/lib/providers/fal'
import { getJob, markFailed } from '@/lib/jobs/store'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) return new Response('Missing id', { status: 400 })
  if (!process.env.FAL_KEY) return new Response('FAL_KEY missing', { status: 500 })

  const job = await getJob(id)
  if (!job) return new Response('Not found', { status: 404 })
  if (job.status === 'completed' || job.status === 'failed') {
    return Response.json({ ok: true, alreadyTerminal: true })
  }

  if (job.providerRequestId && job.providerEndpoint) {
    try {
      await fal.queue.cancel(job.providerEndpoint, { requestId: job.providerRequestId })
    } catch (err) {
      console.warn('fal cancel failed (may already be done):', err)
    }
  }

  await markFailed(id, 'Cancelled')
  return Response.json({ ok: true })
}
