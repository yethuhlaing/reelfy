import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/externals/betterauth'

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

const getSessionCached = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

function buildLoginRedirectPath(path: string): string {
  return `/auth/login?redirect=${encodeURIComponent(path)}`
}

export function getSessionRole(session: AuthSession | null): string | null {
  const role = (session?.user as { role?: string } | undefined)?.role
  return typeof role === 'string' ? role : null
}

export async function getUserSession(
  redirectPathOrOpts?: string | { redirectPath?: string; request?: Request },
): Promise<AuthSession | null> {
  const opts =
    typeof redirectPathOrOpts === 'string'
      ? { redirectPath: redirectPathOrOpts }
      : redirectPathOrOpts

  const session = opts?.request
    ? await auth.api.getSession({ headers: opts.request.headers })
    : await getSessionCached()

  if (!session?.user?.id) {
    if (opts?.redirectPath) redirect(buildLoginRedirectPath(opts.redirectPath))
    return null
  }
  return session
}

export async function requireUserSession(
  request: Request,
): Promise<AuthSession | Response> {
  const session = await getUserSession({ request })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export async function requireAdminSession(
  request: Request,
): Promise<AuthSession | Response> {
  const session = await requireUserSession(request)
  if (session instanceof Response) return session
  if (getSessionRole(session) !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}

export function isAuthError(result: AuthSession | Response): result is Response {
  return result instanceof Response
}
