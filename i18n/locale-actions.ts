'use server'

import { cookies } from 'next/headers'
import { defaultLocale, isLocale, type Locale } from './config'

const LOCALE_COOKIE = 'locale'

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get(LOCALE_COOKIE)?.value
  return value && isLocale(value) ? value : defaultLocale
}

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
