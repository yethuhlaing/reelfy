import { MetadataRoute } from 'next'
import { SEO } from '@/shared/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block internal app routes — not useful for search indexing
        disallow: [
          '/dashboard',
          '/settings',
          '/admin',
          '/usage',
          '/new',
          '/api/',
          '/auth/callback',
        ],
      },
      {
        // Block AI training bots
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai'],
        disallow: '/',
      },
    ],
    sitemap: `${SEO.siteUrl}/sitemap.xml`,
    host: SEO.siteUrl,
  }
}
