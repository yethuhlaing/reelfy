import { MetadataRoute } from 'next'
import { SEO } from '@/shared/lib/seo'

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  {
    url: SEO.siteUrl,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1.0,
  },
  {
    url: `${SEO.siteUrl}/waitlist`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
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
