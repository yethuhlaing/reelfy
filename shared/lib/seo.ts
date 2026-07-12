const SITE_URL = 'https://reelfyme.com'

export const SEO = {
  siteUrl: SITE_URL,
  siteName: 'Reelfy',
  twitterHandle: '@reelfy',

  // Primary product keywords
  primaryKeyword: 'AI video generator for creators',

  defaults: {
    title: 'Reelfy — AI Video Generator for Creators',
    description:
      'Create explainer videos, lofi music, ASMR songs, and cartoon videos with AI in seconds. Reelfy is the all-in-one AI content creation platform built for YouTubers, educators, and digital creators.',
    ogImage: `${SITE_URL}/og-image.png`,
  },

  keywords: {
    core: [
      'AI video generator',
      'AI content creator',
      'AI video maker',
      'generate videos with AI',
      'AI video creation platform',
    ],
    stickman: [
      'stickman video maker AI',
      'AI stickman explainer video',
      'animated stickman video generator',
      'stickman animation AI',
      'explainer video AI maker',
    ],
    lofi: [
      'AI lofi music generator',
      'lofi background music AI',
      'generate lofi music AI',
      'AI lofi beats creator',
      'lofi study music generator',
      'long hour lofi AI',
    ],
    asmr: [
      'AI ASMR generator',
      'ASMR music AI',
      'generate ASMR sounds AI',
      'AI ASMR content creator',
      'ASMR song maker AI',
    ],
    cartoon: [
      'AI cartoon video creator',
      'cartoon video generator AI',
      'animated cartoon AI maker',
      'AI cartoon animation',
      'cartoon explainer video AI',
    ],
    creator: [
      'content creation tools for YouTubers',
      'AI tools for creators',
      'YouTube video generator AI',
      'AI content generation platform',
      'video content AI automation',
    ],
  },
} as const

export function buildTitle(pageTitle: string) {
  return `${pageTitle} | ${SEO.siteName}`
}

export function buildCanonical(path: string) {
  return `${SEO.siteUrl}${path}`
}

export function buildOgImageUrl(slug?: string) {
  if (!slug) return SEO.defaults.ogImage
  return `${SEO.siteUrl}/api/og?slug=${encodeURIComponent(slug)}`
}

export function flatKeywords(...groups: (keyof typeof SEO.keywords)[]): string[] {
  if (groups.length === 0) {
    return Object.values(SEO.keywords).flat()
  }
  return groups.flatMap((g) => [...SEO.keywords[g]])
}
