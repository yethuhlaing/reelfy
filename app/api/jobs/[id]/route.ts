import { getJob } from '@/shared/lib/jobs/store'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
  const job = await getJob(id)
  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  return Response.json(job)
}
