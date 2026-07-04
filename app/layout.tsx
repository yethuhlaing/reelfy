import type { Metadata, Viewport } from 'next'
import { Urbanist, JetBrains_Mono } from 'next/font/google'
import 'lenis/dist/lenis.css'
import './globals.css'
import { Toaster } from '@/shared/ui/sonner'
import { ThemeProvider } from '@/shared/providers/theme-provider'
import { LenisProvider } from '@/shared/providers/lenis-provider'
import { AppShell } from '@/shared/layout/app-shell'
import { getSessionUser } from '@/features/auth/server/auth-session'
import { getUserSession } from '@/shared/lib/db/user'
import { SEO, flatKeywords } from '@/shared/lib/seo'
import { getLocale } from '@/i18n/locale-actions'
import { getDictionary } from '@/i18n/get-dictionary'

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jb-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SEO.siteUrl}/#organization`,
      name: SEO.siteName,
      url: SEO.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${SEO.siteUrl}/logos/logo.png`,
      },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': `${SEO.siteUrl}/#website`,
      url: SEO.siteUrl,
      name: SEO.siteName,
      description: SEO.defaults.description,
      publisher: { '@id': `${SEO.siteUrl}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SEO.siteUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SEO.siteUrl}/#app`,
      name: SEO.siteName,
      url: SEO.siteUrl,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '0',
        offerCount: '3',
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Starter', price: '9', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD' },
        ],
      },
      description:
        'AI-powered video and audio content generation platform. Create stickman explainer videos, lofi music, ASMR songs, and cartoon animations in seconds.',
      featureList: [
        'AI stickman explainer video generation',
        'AI lofi music & long-hour background music',
        'AI ASMR song and sound creation',
        'AI cartoon video creation',
        'Text-to-video AI',
        'AI voiceover generation',
      ],
      publisher: { '@id': `${SEO.siteUrl}/#organization` },
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(SEO.siteUrl),
  title: {
    default: SEO.defaults.title,
    template: `%s | ${SEO.siteName}`,
  },
  description: SEO.defaults.description,
  keywords: flatKeywords(),
  authors: [{ name: SEO.siteName, url: SEO.siteUrl }],
  creator: SEO.siteName,
  publisher: SEO.siteName,
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SEO.siteUrl,
    siteName: SEO.siteName,
    title: SEO.defaults.title,
    description: SEO.defaults.description,
    images: [
      {
        url: SEO.defaults.ogImage,
        width: 1200,
        height: 630,
        alt: `${SEO.siteName} — AI Video Generator for Creators`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: SEO.twitterHandle,
    creator: SEO.twitterHandle,
    title: SEO.defaults.title,
    description: SEO.defaults.description,
    images: [SEO.defaults.ogImage],
  },
  alternates: {
    canonical: SEO.siteUrl,
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getUserSession()
  const currentUser = getSessionUser(session)
  const locale = await getLocale()
  const dictionary = await getDictionary(locale)

  return (
    <html lang={locale} suppressHydrationWarning className={`${urbanist.variable} ${jbMono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Reelfy" />
        {process.env.NEXT_PUBLIC_BLOB_STORAGE_URL ? (
          <>
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_BLOB_STORAGE_URL} />
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_BLOB_STORAGE_URL} crossOrigin="" />
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LenisProvider>
            <AppShell currentUser={currentUser} locale={locale} dictionary={dictionary}>
              {children}
            </AppShell>
            <Toaster />
          </LenisProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
