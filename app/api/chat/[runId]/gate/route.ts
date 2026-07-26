import { wait } from '@trigger.dev/sdk/v3'
import { getRun, updateRun } from '@/features/chat/server/runs-db'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { runId } = await ctx.params
  const body = await request.json().catch(() => ({}))
  const approved = Boolean(body?.approved)

  const run = await getRun(runId)
  if (!run || run.userId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (run.status !== 'awaiting_approval' || !run.gateToken) {
    return Response.json({ error: 'not_awaiting_approval' }, { status: 409 })
  }

  await wait.completeToken(run.gateToken, { approved })
  await updateRun(runId, { status: 'running', gateToken: null })

  return Response.json({ ok: true })
}
