export const locales = ['en', 'my'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  my: 'မြန်မာ',
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
