"use client";

import { motion } from "motion/react";

export default function Hero() {
  return (
    <header className="relative w-full min-h-screen bg-[#F5F0E8] overflow-hidden flex flex-col justify-end pt-32 pb-16 md:pb-24" id="hero-section">
      {/* Container holding top elements and layout */}
      <div className="w-full max-w-7xl mx-auto px-6 relative flex flex-col justify-between flex-grow">
        
        {/* Top Floating Row - Block 01 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start z-10 w-full mb-12">
          {/* Top-Left: "01" block */}
          <div className="md:col-span-4 max-w-sm flex flex-col gap-1.5 pt-4">
            <span className="font-mono text-xs font-semibold text-foreground tracking-widest uppercase">
              01 —
            </span>
            <p className="text-muted-foreground text-xs md:text-sm font-normal leading-relaxed">
              AI image generation uses algorithms and deep learning to create visuals from simple inputs—whether.
            </p>
          </div>

          <div className="hidden md:block md:col-span-4" />

          {/* Top-Right Area for Badge 1 */}
          <div className="md:col-span-4 flex md:justify-end">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#FFB8C8] text-foreground border border-border px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm hover:scale-105 transition-transform cursor-pointer flex items-center gap-2"
            >
              <span className="text-xs">✦</span> Ultra-High Pixel Density
            </motion.div>
          </div>
        </div>

        {/* ⚠️ CRITICAL TEXT-BEHIND-IMAGE CONTAINER */}
        <div className="relative w-full flex flex-col items-center justify-center py-8 my-auto select-none">
          
          {/* Layer 1 (bottom): Headline text */}
          <h1 className="font-display font-black text-center text-[11vw] sm:text-[120px] md:text-[145px] lg:text-[160px] leading-[0.85] tracking-tighter text-foreground select-none pointer-events-none flex flex-col items-center z-0 uppercase">
            <span>THE FUTURE OF</span>
            <span>GENERATED AI</span>
            <span>IMAGES</span>
          </h1>

          {/* Layer 2 (middle): The high-fidelity portrait arched overlay as specified in the Vibrant Palette theme */}
          <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[260px] sm:w-[320px] md:w-[380px] lg:w-[420px] h-[310px] sm:h-[380px] md:h-[450px] lg:h-[490px] z-10 select-none pointer-events-none">
            {/* The arched portrait container */}
            <div 
              className="w-full h-full relative"
              style={{
                backgroundImage: "url('/images/hero.png')",
                backgroundPosition: "center",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                borderRadius: "210px 210px 0 0",
                maskImage: "linear-gradient(to bottom, black 82%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, black 82%, transparent 100%)",
              }}
            >
              {/* Layer 3: Red tracking plus grid overlaid on the face area inside the portrait */}
              <div className="absolute inset-0 grid grid-cols-6 gap-y-7 gap-x-6 sm:gap-y-9 sm:gap-x-8 px-8 sm:px-12 pt-16 pb-8 opacity-75 pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <span key={i} className="text-[#FF5A3C] font-bold text-xs sm:text-sm flex items-center justify-center" style={{ textShadow: "0 0 4px rgba(255, 90, 60, 0.4)" }}>
                    +
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badge mid-left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute left-4 sm:left-12 top-[45%] -translate-y-1/2 z-20 bg-[#FF5A3C] text-white border border-border px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg hover:scale-105 transition-transform cursor-pointer flex items-center gap-2"
          >
            <span>✦</span> Exceptional Visual Realism
          </motion.div>
        </div>

        {/* Bottom Row - Block 02 & Banner Text */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end w-full mt-8 z-20">
          
          {/* Bottom-Left: Dot indicator + Description */}
          <div className="md:col-span-4 max-w-sm flex items-start gap-4">
            <div className="relative flex-shrink-0 w-11 h-11 bg-foreground rounded-full flex items-center justify-center border border-border shadow-sm">
              <span className="w-4 h-4 rounded-full bg-[#FF5A3C] relative">
                <span className="absolute inset-0 rounded-full bg-white/70 w-2 h-2 m-auto left-0 right-0 top-0 bottom-0 origin-center animate-ping"></span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-foreground text-xs md:text-sm font-normal leading-relaxed">
                The Future of AI-Generated Images is a transformative journey where creativity and technology converge.
              </p>
            </div>
          </div>

          <div className="hidden md:block md:col-span-4" />

          {/* Bottom-Right: Block 02 */}
          <div className="md:col-span-4 max-w-sm flex flex-col gap-1.5 md:ml-auto">
            <span className="font-mono text-xs font-semibold text-foreground tracking-widest uppercase">
              02 —
            </span>
            <p className="text-muted-foreground text-xs md:text-sm font-normal leading-relaxed">
              This level of personalization, once a time-consuming process, is now accessible in real-time thanks to AI.
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
