import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/externals/betterauth'

const getSessionCached = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})
function buildLoginRedirectPath(path: string): string {
  return `/auth/login?redirect=${encodeURIComponent(path)}`
}
export async function getUserSession(redirectPath?: string) {
  const session = await getSessionCached()
  if (!session?.user?.id) {
    if (redirectPath) redirect(buildLoginRedirectPath(redirectPath))
    return null
  }
  return session
}