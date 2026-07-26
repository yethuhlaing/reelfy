import { auth } from '@trigger.dev/sdk/v3'
import { getRun } from '@/features/chat/server/runs-db'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { runId } = await ctx.params
  const run = await getRun(runId)
  if (!run || run.userId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  let publicAccessToken: string | null = null
  if (run.triggerRunId) {
    publicAccessToken = await auth.createPublicToken({
      scopes: { read: { runs: [run.triggerRunId] } },
    })
  }

  return Response.json({
    run: {
      id: run.id,
      storyId: run.storyId,
      prompt: run.prompt,
      pipeline: run.pipeline,
      stage: run.stage,
      status: run.status,
      costEstimate: run.costEstimate,
      costActual: run.costActual,
      decisionLog: run.decisionLog,
      error: run.error,
      triggerRunId: run.triggerRunId,
    },
    publicAccessToken,
  })
}
