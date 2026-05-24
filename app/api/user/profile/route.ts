import { eq } from 'drizzle-orm'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import { db } from '@/shared/lib/db'
import { user } from '@/shared/lib/db/schema'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const incomingName = 'name' in body ? body.name : undefined
  const incomingImage = 'image' in body ? body.image : undefined

  const nextName =
    typeof incomingName === 'string'
      ? incomingName.trim()
      : incomingName === null
        ? null
        : undefined
  const nextImage =
    typeof incomingImage === 'string'
      ? incomingImage.trim()
      : incomingImage === null
        ? null
        : undefined

  if (nextName === undefined && nextImage === undefined) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db
    .update(user)
    .set({
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextImage !== undefined ? { image: nextImage } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id))

  return Response.json({ ok: true })
}
