'use client'

import React, { useState, useEffect } from "react";
import { Home, Image as ImageIcon, Search, Plus, Sparkles, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PinkCard() {
  const [promptValue, setPromptValue] = useState("a hyperrealistic happy puppy with soft lighting");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState(
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80"
  );

  // Pool of high quality curated prompt outcomes to support true user interaction
  const generatedOptions = [
    {
      keywords: ["cat", "kitty", "feline"],
      img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["cyber", "neon", "future", "robot"],
      img: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["forest", "nature", "tree", "mountain"],
      img: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["car", "vehicle", "porsche", "speed"],
      img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["puppy", "dog", "husky", "golden"],
      img: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=800&q=80",
    }
  ];

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating || !promptValue.trim()) return;

    setIsGenerating(true);
    setGenerationProgress(0);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            
            // Pick a matching category image or pick random from list
            const searchLower = promptValue.toLowerCase();
            const matched = generatedOptions.find((opt) =>
              opt.keywords.some((kw) => searchLower.includes(kw))
            );

            if (matched) {
              setCurrentImage(matched.img);
            } else {
              // fallback random picsum seed to keep it unique
              const randomSeed = Math.floor(Math.random() * 1000);
              setCurrentImage(`https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80`);
            }
            setIsGenerating(false);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isGenerating, promptValue]);

  return (
    <section className="w-full bg-dark px-4 md:px-12 py-10" id="puppy-interactive-section">
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full rounded-[32px] bg-gradient-to-br from-[#FECCD6] via-[#FFB8C8] to-[#FF8C9F] p-4 sm:p-12 md:p-16 overflow-hidden flex flex-col justify-center items-center h-[520px] md:h-[580px] shadow-2xl border border-[#FFA6B7]">
          
          {/* Subtle noise/grid backdrop inside the pink frame */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

          {/* Top-Left: Small floating pill toolbar with 4 icons */}
          <div className="absolute top-6 left-6 z-20 bg-coral hover:bg-coral/95 text-white p-1 rounded-full shadow-lg flex items-center gap-2 border border-white/10">
            <button className="p-2 bg-white/15 text-white hover:bg-white/30 rounded-full transition-colors" title="Home">
              <Home className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors" title="Gallery">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors" title="Search">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors" title="Plus">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Mid-Right: Floating white pill containing ⚡ icon + Subscriber Badge */}
          <div className="absolute top-6 right-6 sm:top-[40%] sm:right-6 lg:right-10 z-20 bg-white/95 backdrop-blur-md text-dark px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-pink-200/80 max-w-[260px] animate-bounce duration-1000">
            <div className="w-8 h-8 rounded-xl bg-coral flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-coral/30">
              <span className="text-sm">⚡</span>
            </div>
            <div className="flex flex-col select-none">
              <span className="text-xs font-bold text-dark/95 tracking-wide leading-none">High Quality Images</span>
              <span className="text-[10px] text-dark/60 mt-0.5 leading-tight">Subscribe to get awesome images</span>
            </div>
          </div>

          {/* Main Centered Image Placeholder */}
          <div className="relative w-[280px] sm:w-[350px] aspect-square rounded-3xl overflow-hidden shadow-xl border-4 border-white/80 bg-white/40 z-10">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                src={currentImage}
                alt="AI generation Subject"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>

            {/* Simulated Live Loading Frame Mask */}
            {isGenerating && (
              <div className="absolute inset-0 bg-dark/85 backdrop-blur-xs flex flex-col justify-center items-center p-6 z-20">
                <Wand2 className="w-8 h-8 text-coral animate-spin mb-3" />
                <span className="text-white text-xs font-mono mb-2 uppercase tracking-wide">AI Generation In Progress</span>
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-coral h-full transition-[width] duration-150" 
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <span className="text-coral/90 text-[10px] font-mono mt-1.5">{generationProgress}% Rendering</span>
              </div>
            )}
          </div>

          {/* Bottom-Center: White search bar pill with input interaction and blinker */}
          <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-auto sm:w-[500px] z-25">
            <form 
              onSubmit={handleGenerate}
              className="w-full bg-white border border-pink-100 p-2 rounded-full shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5 pl-4 flex-grow">
                <span className={`w-2.5 h-2.5 rounded-full ${isGenerating ? "bg-coral animate-ping" : "bg-dark/30"}`} />
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  disabled={isGenerating}
                  placeholder="AI is generating..."
                  className="bg-transparent text-dark placeholder-dark/40 font-medium text-xs sm:text-sm tracking-wide border-none outline-none focus:ring-0 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2.5 bg-dark hover:bg-coral text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span>{isGenerating ? "Rendering..." : "Generate"}</span>
                <Sparkles className="w-3.5 h-3.5 text-softpink" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
