import { fal } from '@/lib/providers/fal'
import { getJob, markFailed } from '@/lib/jobs/store'

export const runtime = 'nodejs'
export const maxDuration = 60

interface CancelBody {
  jobIds?: string[]
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) return new Response('Missing id', { status: 400 })

  const body = (await req.json().catch(() => ({}))) as CancelBody
  const jobIds = Array.isArray(body.jobIds) ? body.jobIds : []

  if (!process.env.FAL_KEY && jobIds.length > 0) {
    return new Response('FAL_KEY missing', { status: 500 })
  }

  const results = await Promise.allSettled(
    jobIds.map(async (jobId) => {
      const job = await getJob(jobId)
      if (!job) return { jobId, skipped: 'not-found' }
      if (job.status === 'completed' || job.status === 'failed') {
        return { jobId, skipped: 'terminal' }
      }
      if (job.providerRequestId && job.providerEndpoint) {
        try {
          await fal.queue.cancel(job.providerEndpoint, {
            requestId: job.providerRequestId,
          })
        } catch (err) {
          console.warn(`fal cancel failed for ${jobId}:`, err)
        }
      }
      await markFailed(jobId, 'Cancelled')
      return { jobId, cancelled: true }
    }),
  )

  return Response.json({
    ok: true,
    storyId: id,
    count: results.length,
    results: results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
    ),
  })
}
