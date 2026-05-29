
import PortfolioSearch from "@/features/landing/components/PortfolioSearch";
import Footer from "@/features/landing/components/Footer";
import StatsRow from "@/features/landing/components/StatsRow";
import MarqueeStrip from "@/features/landing/components/MarqueeStrip";
import ExploreCardsSection from "@/features/landing/components/ExploreCardsSection";
import VideoSection from "@/features/landing/components/VideoSection";
import CraftingSection from "@/features/landing/components/CraftingSection";
import PinkCard from "@/features/landing/components/PinkCard";
import Navbar from "@/features/landing/components/Navbar";
import Hero from "@/features/landing/components/Hero";
import FeaturedStackSection from "@/features/landing/components/FeaturedStackSection";
import FeaturedStackReversedSection from "@/features/landing/components/FeaturedStackReversedSection";
import VideoTextMaskSection from "@/features/landing/components/VideoTextMaskSection";
import VideoBentoGridSection from "@/features/landing/components/VideoBentoGridSection";

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

