'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { localeNames, locales, type Locale } from '@/i18n/config'
import { getLocaleFromPathname, stripLocaleFromPathname, withLocale } from '@/i18n/locale-path'
import { cn } from '@/shared/lib/utils'

export function LocaleSwitcher({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/'
  const currentLocale = getLocaleFromPathname(pathname)
  const subpath = currentLocale ? stripLocaleFromPathname(pathname) : pathname

  return (
    <div className={cn('flex items-center gap-1 rounded-full border border-white/15 bg-black/25 p-1 backdrop-blur-xl', className)}>
      {locales.map((locale) => {
        const isActive = currentLocale === locale
        return (
          <Link
            key={locale}
            href={withLocale(subpath, locale)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300',
              isActive
                ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
            hrefLang={locale}
            lang={locale as Locale}
          >
            {localeNames[locale]}
          </Link>
        )
      })}
    </div>
  )
}
