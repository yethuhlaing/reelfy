import { Metadata } from 'next'
import { SEO, flatKeywords, buildCanonical } from '@/shared/lib/seo'
import { getDictionary } from '@/i18n/get-dictionary'
import { isLocale } from '@/i18n/config'
import { withLocale } from '@/i18n/locale-path'
import Footer from '@/features/landing/section/Footer'
import ExploreCardsSection from '@/features/landing/section/ExploreCardsSection'
import VideoSection from '@/features/landing/section/VideoSection'
import Navbar from '@/features/landing/components/Navbar'
import Hero from '@/features/landing/section/Hero'
import VideoTextMaskSection from '@/features/landing/section/VideoTextMaskSection'
import VideoBentoGridSection from '@/features/landing/section/VideoBentoGridSection'
import PricingSection from '@/features/landing/section/pricingSection'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params
  const locale = isLocale(localeParam) ? localeParam : 'en'
  const dictionary = await getDictionary(locale)

  return {
    title: dictionary.meta.title,
    description: dictionary.meta.description,
    keywords: flatKeywords('core', 'stickman', 'lofi', 'asmr', 'cartoon', 'creator'),
    alternates: {
      canonical: buildCanonical(withLocale('/', locale)),
    },
    openGraph: {
      title: dictionary.meta.title,
      description: dictionary.meta.description,
      url: `${SEO.siteUrl}${withLocale('/', locale)}`,
      images: [
        {
          url: SEO.defaults.ogImage,
          width: 1200,
          height: 630,
          alt: 'Reelify — Generate AI Videos, Lofi Music, ASMR & Cartoons',
        },
      ],
    },
  }
}

export default function LocaleHomePage() {
  return (
    <div className="relative min-h-screen w-full bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <Hero />
      <ExploreCardsSection />
      <VideoTextMaskSection />
      <VideoBentoGridSection />
      <VideoSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
