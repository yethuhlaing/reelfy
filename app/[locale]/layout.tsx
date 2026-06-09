import { notFound } from 'next/navigation'
import { locales, isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { LocaleProvider } from '@/shared/providers/locale-provider'
import { HtmlLang } from '@/shared/components/html-lang'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  const dictionary = await getDictionary(locale)

  return (
    <LocaleProvider locale={locale} dictionary={dictionary}>
      <HtmlLang locale={locale} />
      {children}
    </LocaleProvider>
  )
}
