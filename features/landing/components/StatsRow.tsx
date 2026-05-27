'use client'

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function StatsRow() {
  // Let's keep separate state for each slider/progress percentage for maximum interactivity
  const [percent1, setPercent1] = useState(78);
  const [percent2, setPercent2] = useState(55);
  const [percent3, setPercent3] = useState(90);

  return (
    <section className="w-full bg-dark grid grid-cols-1 md:grid-cols-3 border-y border-dark" id="stats-section">
      
      {/* CARD 1 — CORAL (#FF5A3C) */}
      <div className="bg-coral p-10 min-h-[350px] flex flex-col justify-between group transition-colors duration-300">
        <div>
          {/* Huge Stat Number */}
          <h2 className="font-display text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none select-none">
            12,000
          </h2>
        </div>

        {/* Interactive slider / progress */}
        <div className="my-6">
          <label className="text-white/70 text-xs font-mono mb-2 block uppercase tracking-wider select-none">
            Sharpness Scale — {percent1}%
          </label>
          <div className="relative w-full h-11 bg-white/20 rounded-full border border-white/15 p-1 flex items-center">
            {/* Filled background track */}
            <div 
              style={{ width: `${percent1}%` }}
              className="h-full bg-white/35 rounded-full transition-all duration-350 ease-out" 
            />
            
            {/* Draggable Circle Button */}
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={percent1}
              onChange={(e) => setPercent1(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
            
            {/* Visually stunning slider handle overlay */}
            <div 
              style={{ left: `calc(${percent1}% - 22px)` }}
              className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-dark rounded-full flex items-center justify-center text-white transition-all duration-350 shadow-md group-hover:scale-110 pointer-events-none"
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-white text-sm font-medium leading-relaxed max-w-sm">
            With 12,000 horizontal pixels, 12K delivers unparalleled sharpness and detail.
          </p>
        </div>
      </div>

      {/* CARD 2 — MINT (#B8D4D0) */}
      {/* Same structure but pill is at the top, stat in middle, different color themes */}
      <div className="bg-[#B8D4D0] p-10 min-h-[350px] flex flex-col justify-between group transition-colors duration-300 text-dark">
        {/* slider at high level */}
        <div>
          <label className="text-dark/60 text-xs font-mono mb-2 block uppercase tracking-wider select-none">
            Recognition Rate — {percent2}%
          </label>
          <div className="relative w-full h-11 bg-dark/10 rounded-full border border-dark/10 p-1 flex items-center">
            {/* Filled track */}
            <div 
              style={{ width: `${percent2}%` }}
              className="h-full bg-dark/15 rounded-full transition-all duration-350 ease-out" 
            />
            
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={percent2}
              onChange={(e) => setPercent2(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
            
            <div 
              style={{ left: `calc(${percent2}% - 22px)` }}
              className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-dark rounded-full flex items-center justify-center text-[#B8D4D0] transition-all duration-350 shadow-md group-hover:scale-110 pointer-events-none"
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="my-4">
          <h2 className="font-display text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none select-none drop-shadow-sm">
            32,000
          </h2>
        </div>

        <div>
          <p className="text-dark/90 text-sm font-medium leading-relaxed max-w-sm">
            Over 32,000 works that have been recognized as the same as the original.
          </p>
        </div>
      </div>

      {/* CARD 3 — PINK (#FFB8C8) */}
      {/* Pink stats card with unique rhythm layout */}
      <div className="bg-[#FFB8C8] p-10 min-h-[350px] flex flex-col justify-between group transition-colors duration-300 text-dark">
        <div>
          <h2 className="font-display text-7xl sm:text-8xl font-black text-white tracking-tighter leading-none select-none drop-shadow-sm">
            80
          </h2>
        </div>

        <div className="my-4">
          <p className="text-dark/90 text-sm font-medium leading-relaxed max-w-sm">
            There are 80 major startups that use and support the progress or development of our AI.
          </p>
        </div>

        {/* Slider at the bottom */}
        <div>
          <label className="text-dark/60 text-xs font-mono mb-2 block uppercase tracking-wider select-none">
            Growth Index — {percent3}%
          </label>
          <div className="relative w-full h-11 bg-white/30 rounded-full border border-dark/10 p-1 flex items-center">
            {/* Filled track */}
            <div 
              style={{ width: `${percent3}%` }}
              className="h-full bg-white/40 rounded-full transition-all duration-350 ease-out" 
            />
            
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={percent3}
              onChange={(e) => setPercent3(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
            
            <div 
              style={{ left: `calc(${percent3}% - 22px)` }}
              className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-dark rounded-full flex items-center justify-center text-[#FFB8C8] transition-all duration-350 shadow-md group-hover:scale-110 pointer-events-none"
            >
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
