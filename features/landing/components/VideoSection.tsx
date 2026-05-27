'use client'

import { useState } from "react";
import { Play, X, Star, Sparkles } from "lucide-react";

export default function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="w-full relative bg-background px-4 md:px-12 py-10" id="video-section">
      <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden relative h-[480px] group border border-border shadow-2xl">
        
        {/* Background Base Image */}
        <img
          src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=80"
          alt="Woman in red futuristic sunglasses and high collar turtleneck"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#FF5A3C] via-[#FF5A3C]/85 to-transparent md:w-[75%] lg:w-[60%] z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent z-10" />

        {/* content wrapper */}
        <div className="absolute inset-0 z-20 p-8 sm:p-12 flex flex-col justify-between">
          
          {/* Top Info or Badge */}
          <div className="flex justify-between items-start">
            <span className="glass border border-border text-foreground/90 text-[10px] sm:text-xs font-mono px-4 py-2 rounded-full uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              Interactive Demo
            </span>
          </div>

          {/* Prompt / Explanation copy inside Left Area */}
          <div className="max-w-xl md:mb-6">
            <p className="text-foreground text-lg sm:text-xl lg:text-2xl font-light leading-relaxed tracking-wide drop-shadow-md">
              AI image generation uses algorithms and deep learning to create visuals from simple inputs — whether it's a written prompt, a sketch, or even a dataset of styles and patterns.
            </p>
          </div>

          {/* Footer of card */}
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-3 bg-background/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-border text-foreground shadow-sm leading-none">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="text-[11px] font-mono tracking-wider uppercase">12P+ Lorem Ipsum</span>
            </div>
          </div>

        </div>

        {/* Centered Play Button Over Person */}
        <div className="absolute top-1/2 left-[50%] md:left-[75%] -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3">
          <button
            onClick={() => setIsPlaying(true)}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-card hover:bg-[#FFB8C8] hover:scale-110 active:scale-95 text-foreground rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,90,60,0.4)] transition-all duration-300 pointer-events-auto cursor-pointer"
            aria-label="Play video"
          >
            <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-primary-foreground text-primary-foreground translate-x-0.5" />
          </button>
          <span className="text-foreground text-[11px] font-mono tracking-widest uppercase bg-background/40 backdrop-blur-md px-3 py-1 rounded-full drop-shadow-md select-none">
            WATCH PROCESS
          </span>
        </div>

      </div>

      {/* Video Overlay Modal */}
      {isPlaying && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl aspect-video bg-card rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col justify-center items-center">
            
            {/* Close Button */}
            <button
               onClick={() => setIsPlaying(false)}
               className="absolute top-4 right-4 bg-secondary hover:bg-[#FF5A3C] text-foreground hover:text-white p-2.5 rounded-full transition-colors z-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Simulated Live Generation Reel */}
            <div className="p-8 text-center max-w-md flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#FF5A3C]/20 flex items-center justify-center text-[#FF5A3C] mb-4 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-display text-3xl font-black text-foreground uppercase tracking-tight mb-2">
                AILENG ENGINE v4
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Connected to the standard super-resolution diffusion node. Generating pixel density parameters...
              </p>
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-2">
                <div className="bg-[#FF5A3C] h-full animate-pulse" style={{ width: "80%" }}></div>
              </div>
              <p className="text-[#FF5A3C] text-xs font-mono animate-pulse uppercase tracking-wider">
                ● LIVE GRAPHICS PIPELINE RUNNING
              </p>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
