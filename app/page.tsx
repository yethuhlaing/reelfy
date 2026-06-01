import { Metadata } from "next";
import { SEO, flatKeywords, buildCanonical } from "@/shared/lib/seo";

export const metadata: Metadata = {
  title: "StickStory — AI Video Generator for Creators | Stickman, Lofi, ASMR & Cartoon",
  description:
    "StickStory lets creators generate stickman explainer videos, long-hour lofi music, ASMR songs, and cartoon videos with AI — no editing skills needed. Start free.",
  keywords: flatKeywords("core", "stickman", "lofi", "asmr", "cartoon", "creator"),
  alternates: {
    canonical: buildCanonical("/"),
  },
  openGraph: {
    title: "StickStory — AI Video Generator for Creators",
    description:
      "Generate stickman videos, lofi music, ASMR & cartoon videos with AI. Built for YouTubers, educators, and digital creators. Start free.",
    url: SEO.siteUrl,
    images: [
      {
        url: SEO.defaults.ogImage,
        width: 1200,
        height: 630,
        alt: "StickStory — Generate AI Videos, Lofi Music, ASMR & Cartoons",
      },
    ],
  },
};

import PortfolioSearch from "@/features/landing/components/PortfolioSearch";
import Footer from "@/features/landing/section/Footer";
import StatsRow from "@/features/landing/components/StatsRow";
import MarqueeStrip from "@/features/landing/components/MarqueeStrip";
import ExploreCardsSection from "@/features/landing/section/ExploreCardsSection";
import VideoSection from "@/features/landing/section/VideoSection";
import CraftingSection from "@/features/landing/section/CraftingSection";
import PinkCard from "@/features/landing/components/PinkCard";
import Navbar from "@/features/landing/components/Navbar";
import Hero from "@/features/landing/section/Hero";
import FeaturedStackSection from "@/features/landing/section/FeaturedStackSection";
import FeaturedStackReversedSection from "@/features/landing/section/FeaturedStackReversedSection";
import VideoTextMaskSection from "@/features/landing/section/VideoTextMaskSection";
import VideoBentoGridSection from "@/features/landing/section/VideoBentoGridSection";
import SpeakerSection from "@/features/landing/section/SpeakerSection";

export default function App() {
  return (
    <div className="w-full bg-background text-foreground min-h-screen relative font-sans selection:bg-primary selection:text-primary-foreground">
      {/* 1. Navigation Bar */}
      <Navbar />

      {/* 2. Hero Section (with critical text-behind-image portrait layers) */}
      <Hero />

      {/* 2b. Featured stacker scroll showcase */}
      <FeaturedStackSection />

      {/* 2b-alt. Featured stack — mirrored layout */}
      <FeaturedStackReversedSection />

      {/* 2b-alt. Speaker Section */}
      <SpeakerSection />
      {/* 2c. Video through text mask */}
      <VideoTextMaskSection />

      {/* 2d. Bento video grid */}
      <VideoBentoGridSection />

      {/* 3. Stats Row (3 colored interactive cards) */}
      <StatsRow />

      {/* 4. Scrolling Marquee Strip */}
      <MarqueeStrip />

      {/* 5. Three-card explore section */}
      <ExploreCardsSection />

      {/* 6. Cinematic Video Process Section */}
      <VideoSection />

      {/* 7. Diagonal Crafting Badges Section */}
      <CraftingSection />

      {/* 8. Interactive Custom Generator Card */}
      <PinkCard />

      {/* 9 & 10. Instant Assets Search Hub & Masonry Portfolio Grid */}
      <PortfolioSearch />

      {/* 11. Styled Corporate Footer */}
      <Footer />
    </div>
  );
}

