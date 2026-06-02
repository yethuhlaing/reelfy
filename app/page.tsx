import { Metadata } from "next";
import { SEO, flatKeywords, buildCanonical } from "@/shared/lib/seo";

export const metadata: Metadata = {
  title: "Reelify — AI Video Generator for Creators | Explainers, Lofi, ASMR & Cartoon",
  description:
    "Reelify lets creators generate explainer videos, long-hour lofi music, ASMR songs, and cartoon videos with AI — no editing skills needed. Start free.",
  keywords: flatKeywords("core", "stickman", "lofi", "asmr", "cartoon", "creator"),
  alternates: {
    canonical: buildCanonical("/"),
  },
  openGraph: {
    title: "Reelify — AI Video Generator for Creators",
    description:
      "Generate explainer videos, lofi music, ASMR & cartoon videos with AI. Built for YouTubers, educators, and digital creators. Start free.",
    url: SEO.siteUrl,
    images: [
      {
        url: SEO.defaults.ogImage,
        width: 1200,
        height: 630,
        alt: "Reelify — Generate AI Videos, Lofi Music, ASMR & Cartoons",
      },
    ],
  },
};
import Footer from "@/features/landing/section/Footer";
import ExploreCardsSection from "@/features/landing/section/ExploreCardsSection";
import VideoSection from "@/features/landing/section/VideoSection";
import Navbar from "@/features/landing/components/Navbar";
import Hero from "@/features/landing/section/Hero";
import VideoTextMaskSection from "@/features/landing/section/VideoTextMaskSection";
import VideoBentoGridSection from "@/features/landing/section/VideoBentoGridSection";
import PricingSection from "@/features/landing/section/pricingSection";

export default function App() {
  return (
    <div className="w-full bg-background text-foreground min-h-screen relative font-sans selection:bg-primary selection:text-primary-foreground">
      {/* 1. Navigation Bar */}
      <Navbar />

      {/* 2. Hero Section (with critical text-behind-image portrait layers) */}
      <Hero />

      {/* 5. Three-card explore section */}
      <ExploreCardsSection />

      {/* 2c. Video through text mask */}
      <VideoTextMaskSection />

      {/* 2d. Bento video grid */}
      <VideoBentoGridSection />

      {/* 6. Pipeline + sample output */}
      <VideoSection />

      <PricingSection />

      {/* 11. Styled Corporate Footer */}
      <Footer />
    </div>
  );
}

