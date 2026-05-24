import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './features/auth/server/auth'


const protectedPathMatchers = [
  /^\/dashboard(?:\/|$)/,
  /^\/settings(?:\/|$)/,
  /^\/usage(?:\/|$)/,
  /^\/new(?:\/|$)/,
  /^\/[^/]+\/new(?:\/|$)/,
  /^\/[^/]+\/story\/[^/]+(?:\/|$)/,
]

function isProtectedPath(pathname: string) {
  return protectedPathMatchers.some((matcher) => matcher.test(pathname))
}

function isAdminPath(pathname: string) {
  return /^\/admin(?:\/|$)/.test(pathname)
}

function isApiPath(pathname: string) {
  return /^\/api(?:\/|$)/.test(pathname)
}

function isAuthApiPath(pathname: string) {
  return /^\/api\/auth(?:\/|$)/.test(pathname)
}

function isWebhookPath(pathname: string) {
  return /^\/api\/webhooks(?:\/|$)/.test(pathname)
}

function requiresSession(pathname: string) {
  if (isAuthApiPath(pathname) || isWebhookPath(pathname)) return false
  if (isApiPath(pathname)) return true
  return isProtectedPath(pathname) || isAdminPath(pathname)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (!requiresSession(pathname)) {
    return NextResponse.next()
  }

  const session = await auth.api
    .getSession({
      headers: request.headers,
    })
    .catch(() => null)

  if (!session) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = (session.user as { role?: string } | undefined)?.role
  if (isAdminPath(pathname) && userRole !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
