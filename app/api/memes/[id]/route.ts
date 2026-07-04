import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { deleteGenerationForUser, getGenerationForUser } from '@/features/meme/server/memes-db'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id } = await params
  const generation = await getGenerationForUser(id, session.user.id)
  if (!generation) {
    return new Response(JSON.stringify({ error: 'Generation not found' }), { status: 404 })
  }
  return Response.json(generation)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const { id } = await params
  const ok = await deleteGenerationForUser(id, session.user.id)
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Generation not found' }), { status: 404 })
  }
  return new Response(null, { status: 204 })
}
