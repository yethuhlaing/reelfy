import { notFound } from 'next/navigation'
import { RunStream } from '@/features/chat/components/RunStream'
import { getRun } from '@/features/chat/server/runs-db'
import { auth } from '@trigger.dev/sdk/v3'
import { getUserSession } from '@/shared/lib/db/user'

export default async function DashboardRunPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const session = await getUserSession(`/dashboard/run/${runId}`)
  if (!session) return null

  const run = await getRun(runId)
  if (!run || run.userId !== session.user.id) notFound()

  let publicAccessToken: string | null = null
  if (run.triggerRunId) {
    publicAccessToken = await auth.createPublicToken({
      scopes: { read: { runs: [run.triggerRunId] } },
    })
  }

  return (
    <div className="flex flex-1 flex-col px-6">
      <RunStream
        runId={run.id}
        triggerRunId={run.triggerRunId}
        initialToken={publicAccessToken}
        storyId={run.storyId}
      />
    </div>
  )
}
