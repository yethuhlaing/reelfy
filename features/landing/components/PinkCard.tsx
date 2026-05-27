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
            
            const searchLower = promptValue.toLowerCase();
            const matched = generatedOptions.find((opt) =>
              opt.keywords.some((kw) => searchLower.includes(kw))
            );

            if (matched) {
              setCurrentImage(matched.img);
            } else {
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
    <section className="w-full bg-background px-4 md:px-12 py-10" id="puppy-interactive-section">
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full rounded-[32px] bg-gradient-to-br from-[#FECCD6] via-[#FFB8C8] to-[#FF8C9F] p-4 sm:p-12 md:p-16 overflow-hidden flex flex-col justify-center items-center h-[520px] md:h-[580px] shadow-2xl border border-[#FFA6B7]">
          
          <div className="absolute inset-0 bg-[radial-gradient(var(--foreground)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08]" />

          <div className="absolute top-6 left-6 z-20 bg-[#FF5A3C] hover:bg-[#FF5A3C]/95 text-white p-1 rounded-full shadow-lg flex items-center gap-2 border border-border">
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

          <div className="absolute top-6 right-6 sm:top-[40%] sm:right-6 lg:right-10 z-20 bg-card/95 backdrop-blur-md text-card-foreground px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-border max-w-[260px] animate-bounce duration-1000">
            <div className="w-8 h-8 rounded-xl bg-[#FF5A3C] flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-[#FF5A3C]/30">
              <span className="text-sm">⚡</span>
            </div>
            <div className="flex flex-col select-none">
              <span className="text-xs font-bold text-foreground tracking-wide leading-none">High Quality Images</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Subscribe to get awesome images</span>
            </div>
          </div>

          <div className="relative w-[280px] sm:w-[350px] aspect-square rounded-3xl overflow-hidden shadow-xl border-4 border-card/80 bg-card/40 z-10">
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

            {isGenerating && (
              <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col justify-center items-center p-6 z-20">
                <Wand2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <span className="text-foreground text-xs font-mono mb-2 uppercase tracking-wide">AI Generation In Progress</span>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#FF5A3C] h-full transition-[width] duration-150" 
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <span className="text-primary/90 text-[10px] font-mono mt-1.5">{generationProgress}% Rendering</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-auto sm:w-[500px] z-25">
            <form 
              onSubmit={handleGenerate}
              className="w-full bg-card border border-border p-2 rounded-full shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5 pl-4 flex-grow">
                <span className={`w-2.5 h-2.5 rounded-full ${isGenerating ? "bg-[#FF5A3C] animate-ping" : "bg-muted-foreground/40"}`} />
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  disabled={isGenerating}
                  placeholder="AI is generating..."
                  className="bg-transparent text-foreground placeholder:text-muted-foreground font-medium text-xs sm:text-sm tracking-wide border-none outline-none focus:ring-0 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2.5 bg-foreground hover:bg-[#FF5A3C] text-background hover:text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 transform active:scale-95 flex items-center gap-1.5 flex-shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span>{isGenerating ? "Rendering..." : "Generate"}</span>
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
