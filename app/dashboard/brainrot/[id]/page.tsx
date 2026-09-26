import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { BrainrotProjectPageClient } from '@/features/brainrot/components/BrainrotProjectPageClient'
import { hydrateBrainrotProject } from '@/features/brainrot/server/brainrot-export'
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

  // Hydrating reconciles the current Run against fal, so a project opened
  // mid-export shows the real phase — and one whose completion webhook never
  // arrived shows the finished reel — without any job id in the URL.
  const hydrated = await hydrateBrainrotProject(session.user.id, id)
  if (!hydrated) notFound()

  return (
    <Suspense fallback={null}>
      <BrainrotProjectPageClient project={hydrated.project} exportRun={hydrated.exportRun} />
    </Suspense>
  )
}
