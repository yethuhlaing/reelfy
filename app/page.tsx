
import PortfolioSearch from "@/features/landing/components/PortfolioSearch";
import Footer from "@/features/landing/components/Footer";
import StatsRow from "@/features/landing/components/StatsRow";
import MarqueeStrip from "@/features/landing/components/MarqueeStrip";
import VideoSection from "@/features/landing/components/VideoSection";
import CraftingSection from "@/features/landing/components/CraftingSection";
import PinkCard from "@/features/landing/components/PinkCard";
import Navbar from "@/features/landing/components/Navbar";
import Hero from "@/features/landing/components/Hero";

export default function App() {
  return (
    <div className="w-full bg-dark text-dark min-h-screen relative font-sans selection:bg-coral selection:text-white">
      {/* 1. Navigation Bar */}
      <Navbar />

      {/* 2. Hero Section (with critical text-behind-image portrait layers) */}
      <Hero />

      {/* 3. Stats Row (3 colored interactive cards) */}
      <StatsRow />

      {/* 4. Scrolling Marquee Strip */}
      <MarqueeStrip />

      {/* 5. Cinematic Video Process Section */}
      <VideoSection />

      {/* 6. Diagonal Crafting Badges Section */}
      <CraftingSection />

      {/* 7. Interactive Custom Generator Card */}
      <PinkCard />

      {/* 8 & 9. Instant Assets Search Hub & Masonry Portfolio Grid */}
      <PortfolioSearch />

      {/* 10. Styled Corporate Footer */}
      <Footer />
    </div>
  );
}

