import { randomUUID } from 'node:crypto'
import { db } from '@/shared/lib/db'
import { waitlist } from '@/shared/lib/db/schema'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawEmail = 'email' in body ? body.email : undefined
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  // Idempotent: duplicate emails are ignored and still return success.
  await db
    .insert(waitlist)
    .values({ id: randomUUID(), email })
    .onConflictDoNothing({ target: waitlist.email })

  return Response.json({ success: true }, { status: 200 })
}
