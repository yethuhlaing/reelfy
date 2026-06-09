import type { Locale } from './config'

const dictionaries: Record<Locale, () => Promise<typeof import('./translations/en.json')>> = {
  en: () => import('./translations/en.json').then((module) => module.default),
  my: () => import('./translations/my.json').then((module) => module.default),
}

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)['en']>>

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}
