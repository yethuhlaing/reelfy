"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export default function CraftingSection() {
  return (
    <section className="w-full bg-dark px-6 md:px-12 py-16 md:py-24" id="crafting-section">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Massive Display Header */}
        <div className="flex flex-col">
          <h2 className="font-display text-6xl sm:text-7xl md:text-[85px] font-black leading-[0.85] text-white tracking-widest uppercase flex flex-col">
            <span className="text-white">CRAFTING</span>
            <span className="text-white">UNIQUE VISUALS</span>
          </h2>
        </div>

        {/* Right Side: pill badging stacked diagonally, and light gray paragraph */}
        <div className="flex flex-col gap-10 lg:pl-8">
          
          {/* Staggered Diagonal Pills Container */}
          <div className="flex flex-col gap-3.5 items-start">
            
            {/* Coral pill */}
            <motion.div
              whileHover={{ x: 12, scale: 1.02 }}
              className="bg-coral text-white text-xs md:text-sm font-semibold uppercase tracking-wider px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-white/5 cursor-pointer transform transition-all duration-300 translate-x-0"
            >
              <Sparkles className="w-4 h-4 text-softpink" />
              ✦ Enhanced Flexibility in Post-Production
            </motion.div>

            {/* Mint pill */}
            <motion.div
              whileHover={{ x: 12, scale: 1.02 }}
              className="bg-mint text-dark text-xs md:text-sm font-semibold uppercase tracking-wider px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-white/5 cursor-pointer transform transition-all duration-300 sm:translate-x-6"
            >
              <Sparkles className="w-4 h-4 text-coral" />
              ✦ Immersive Experiences
            </motion.div>

            {/* Pink pill */}
            <motion.div
              whileHover={{ x: 12, scale: 1.02 }}
              className="bg-softpink text-dark text-xs md:text-sm font-semibold uppercase tracking-wider px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm border border-white/5 cursor-pointer transform transition-all duration-300 sm:translate-x-12"
            >
              <Sparkles className="w-4 h-4 text-dark" />
              ✦ Future-Ready Technology
            </motion.div>

          </div>

          {/* Description copy box */}
          <div className="max-w-md pt-2 border-t border-white/10">
            <p className="text-white/60 text-sm md:text-base leading-relaxed font-light font-sans">
              Create tailored content that resonates more deeply with specific audiences, producing variations in color, composition, and style based on consumer preferences.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
