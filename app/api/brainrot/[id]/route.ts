import { notFound } from 'next/navigation'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  deleteBrainrotProjectForUser,
  getBrainrotProjectForUser,
} from '@/features/brainrot/server/brainrot-db'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const { id } = await ctx.params
  const project = await getBrainrotProjectForUser(id, session.user.id)
  if (!project) notFound()

  return Response.json({ project })
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
