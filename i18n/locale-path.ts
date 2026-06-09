import { defaultLocale, isLocale, type Locale } from './config'

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split('/').filter(Boolean)[0]
  return segment && isLocale(segment) ? segment : null
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname)
  if (!locale) return pathname

  const rest = pathname.slice(locale.length + 1)
  return rest || '/'
}

export function isPublicLocalePath(pathname: string): boolean {
  const locale = getLocaleFromPathname(pathname)
  if (!locale) return pathname === '/'

  const subpath = stripLocaleFromPathname(pathname)
  return subpath === '/' || subpath === '/waitlist'
}

export function withLocale(path: string, locale: Locale = defaultLocale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/') return `/${locale}`
  return `/${locale}${normalized}`
}
