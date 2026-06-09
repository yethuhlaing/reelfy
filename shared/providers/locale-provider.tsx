'use client'

import { createContext, useContext, useMemo } from 'react'
import type { Dictionary } from '@/i18n/get-dictionary'
import type { Locale } from '@/i18n/config'

type LocaleContextValue = {
  locale: Locale
  dictionary: Dictionary
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function translate(dictionary: Dictionary, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, dictionary)

  return typeof value === 'string' ? value : key
}

export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale
  dictionary: Dictionary
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      locale,
      dictionary,
      t: (key: string) => translate(dictionary, key),
    }),
    [locale, dictionary],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
