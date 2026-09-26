import { notFound } from 'next/navigation'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { deleteBrainrotProjectForUser } from '@/features/brainrot/server/brainrot-db'
import { hydrateBrainrotProject } from '@/features/brainrot/server/brainrot-export'

export const runtime = 'nodejs'

/**
 * The project plus its current export Run, reconciled against fal. This is
 * what a client re-gets when its progress stream drops — it never needs a
 * job id to find out where the export got to.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id } = await ctx.params
  const hydrated = await hydrateBrainrotProject(session.user.id, id)
  if (!hydrated) notFound()

  return Response.json(hydrated)
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id } = await ctx.params
  const ok = await deleteBrainrotProjectForUser(id, session.user.id)
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  }
  return Response.json({ ok: true })
}
