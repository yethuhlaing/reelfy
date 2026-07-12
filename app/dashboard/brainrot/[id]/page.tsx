import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { BrainrotProjectPageClient } from '@/features/brainrot/components/BrainrotProjectPageClient'
import { getBrainrotProjectForUser } from '@/features/brainrot/server/brainrot-db'
import { reconcileBrainrotExportFromFal } from '@/features/brainrot/server/export-finalize'
import { getUserSession } from '@/shared/lib/db/user'

export const dynamic = 'force-dynamic'

export default async function BrainrotDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getUserSession('/dashboard')
  if (!session) return null

  let project = await getBrainrotProjectForUser(id, session.user.id)
  if (!project) notFound()

  // Self-heal a project stuck in 'rendering' by polling fal directly. Covers the
  // case where the completion webhook never reached us (no public URL in dev).
  // Export runs in two phases (compose → subtitle); reconcile up to twice.
  if (project.status === 'rendering' && project.renderJobId) {
    for (let i = 0; i < 2; i++) {
      const terminal = await reconcileBrainrotExportFromFal(project.renderJobId).catch(() => false)
      if (terminal) break
    }
    project = (await getBrainrotProjectForUser(id, session.user.id)) ?? project
  }

  return (
    <Suspense fallback={null}>
      <BrainrotProjectPageClient project={project} />
    </Suspense>
  )
}
