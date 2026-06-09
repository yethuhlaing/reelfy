import { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'
import { withLocale } from '@/i18n/locale-path'
import { SEO } from '@/shared/lib/seo'

const PUBLIC_LOCALE_PATHS = ['/', '/waitlist'] as const

// Static routes + their SEO priority/changefreq
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  ...locales.flatMap((locale) =>
    PUBLIC_LOCALE_PATHS.map((path) => ({
      url: `${SEO.siteUrl}${withLocale(path, locale)}`,
      lastModified: new Date(),
      changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: path === '/' ? 1.0 : 0.7,
    })),
  ),
  {
    url: `${SEO.siteUrl}/pricing`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  {
    url: `${SEO.siteUrl}/auth/login`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    url: `${SEO.siteUrl}/auth/signup`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.6,
  },
]

// Content category landing pages — each maps to /[category]
// Add new categories here as they launch
const CONTENT_CATEGORIES = [
  'stickman-explainer',
  'lofi-music',
  'asmr',
  'cartoon-video',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const categoryRoutes: MetadataRoute.Sitemap = CONTENT_CATEGORIES.map((slug) => ({
    url: `${SEO.siteUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...STATIC_ROUTES, ...categoryRoutes]
}
