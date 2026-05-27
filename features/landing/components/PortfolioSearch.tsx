'use client'

import { useState } from "react";
import { Search, ChevronDown, Sparkles, Filter, SlidersHorizontal, RefreshCw } from "lucide-react";
import { PortfolioImage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { PORTFOLIO_IMAGES } from "../data";

export default function PortfolioSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAspect, setSelectedAspect] = useState("All");
  const [visibleCount, setVisibleCount] = useState(8);
  const [sortBy, setSortBy] = useState("Features");

  // Dropdown states
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Options arrays
  const colors = ["All", "warm", "cool", "neutral", "colorful"];
  const categories = ["All", "Portrait", "Nature", "Abstract", "Architecture", "Car", "Animal"];
  const aspectRatios = ["All", "Square (1:1)", "Portrait (3:4 or 2:3)", "Landscape (4:3)"];
  const sortOptions = ["Features", "A-Z Title", "Random Mixed"];

  // Filter application
  const filteredImages = PORTFOLIO_IMAGES.filter((img) => {
    // 1. Search Query Check
    const matchSearch =
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Color Checklist
    const matchColor = selectedColor === "All" || img.color === selectedColor;

    // 3. Category Checklist
    const matchCategory = selectedCategory === "All" || img.category === selectedCategory;

    // 4. Aspect Ratio Checklist
    let matchAspect = true;
    if (selectedAspect !== "All") {
      if (selectedAspect.startsWith("Square")) {
        matchAspect = img.aspectRatio === "aspect-[1/1]";
      } else if (selectedAspect.startsWith("Portrait")) {
        matchAspect = img.aspectRatio === "aspect-[3/4]" || img.aspectRatio === "aspect-[2/3]";
      } else if (selectedAspect.startsWith("Landscape")) {
        matchAspect = img.aspectRatio === "aspect-[4/3]";
      }
    }

    return matchSearch && matchColor && matchCategory && matchAspect;
  });

  // Sort application
  const sortedImages = [...filteredImages].sort((a, b) => {
    if (sortBy === "A-Z Title") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "Random Mixed") {
      return Number(a.id) % 2 === Number(b.id) % 2 ? 1 : -1;
    }
    return 0; // Default: 'Features' maintains original index order
  });

  // Paginated items
  const pagedImages = sortedImages.slice(0, visibleCount);

  // Column Distribution logic for masonry grid
  const cols: PortfolioImage[][] = [[], [], [], []];
  pagedImages.forEach((img, i) => {
    cols[i % 4].push(img);
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedColor("All");
    setSelectedCategory("All");
    setSelectedAspect("All");
    setSortBy("Features");
  };

  return (
    <section className="w-full bg-dark text-white px-6 md:px-12 py-16 md:py-24" id="search-section">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        
        {/* ================= SECTION 8: HEADER & CONTROLS ================= */}
        <div className="text-center flex flex-col items-center gap-6">
          
          {/* Section Indicator */}
          <span className="text-xs font-mono tracking-[0.2em] font-semibold text-coral uppercase select-none leading-none flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-softpink" />
            Vast Creative Assets
          </span>

          {/* Headline (FIND STUNNING ASSETS INSTANTLY) */}
          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl font-black leading-[0.9] tracking-widest text-center uppercase">
            <span>FIND STUNNING</span>
            <br />
            <span>ASSETS INSTANTLY</span>
          </h2>

          {/* Search Input Bar (Dark Pill) */}
          <div className="w-full max-w-xl relative mt-4">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images, styles, topics..."
              className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-coral duration-300 py-4.5 pl-14 pr-6 rounded-full text-sm font-medium tracking-wide outline-none text-white focus:ring-1 focus:ring-coral shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold bg-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full uppercase"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dropdown Filters row */}
          <div className="w-full flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mt-4 border-t border-b border-white/5 py-5">
            
            {/* Left side: filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Category dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setColorDropdownOpen(false);
                    setAspectDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedCategory !== "All"
                      ? "bg-coral border-coral text-white"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Category: {selectedCategory}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-44 bg-[#141416] border border-white/15 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedCategory === cat ? "bg-coral text-white" : "text-white/70 hover:bg-white/5"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Color dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setColorDropdownOpen(!colorDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAspectDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedColor !== "All"
                      ? "bg-coral border-coral text-white"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Color: {selectedColor}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${colorDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {colorDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-40 bg-[#141416] border border-white/15 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedColor(c);
                          setColorDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                          selectedColor === c ? "bg-coral text-white" : "text-white/70 hover:bg-white/5"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Aspect Ratio Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setAspectDropdownOpen(!aspectDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setColorDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedAspect !== "All"
                      ? "bg-coral border-coral text-white"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Aspect: {selectedAspect.split(" ")[0]}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aspectDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {aspectDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-52 bg-[#141416] border border-white/15 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {aspectRatios.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setSelectedAspect(a);
                          setAspectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedAspect === a ? "bg-coral text-white" : "text-white/70 hover:bg-white/5"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Global Reset Filter */}
              {(selectedColor !== "All" || selectedCategory !== "All" || selectedAspect !== "All" || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-coral text-white text-[10px] font-bold uppercase rounded-full transition-colors font-mono"
                  title="Reset all filters"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}

            </div>

            {/* Right side: Sort control */}
            <div className="relative flex justify-end">
              <button
                onClick={() => {
                  setSortDropdownOpen(!sortDropdownOpen);
                  setCategoryDropdownOpen(false);
                  setColorDropdownOpen(false);
                  setAspectDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold rounded-full tracking-wide text-white uppercase select-none cursor-pointer transition-colors"
                id="sort-by-features"
              >
                Sort by: {sortBy}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {sortDropdownOpen && (
                <div className="absolute top-[105%] right-0 z-40 w-44 bg-[#141416] border border-white/15 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSortBy(opt);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        sortBy === opt ? "bg-white text-dark" : "text-white/70 hover:bg-white/5"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ================= SECTION 9: INDEX PORTFOLIO MASONRY GRID ================= */}
        {sortedImages.length === 0 ? (
          <div className="py-24 text-center text-white/40 flex flex-col items-center justify-center gap-3">
            <Filter className="w-10 h-10 stroke-1" />
            <h3 className="font-display text-2xl font-black uppercase text-white tracking-widest leading-none">
              No matching assets
            </h3>
            <p className="text-sm font-light max-w-sm">
              We couldn't find any generated results for current criteria. Try resetting filters or changing terms.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-3 px-6 py-2.5 bg-coral text-white text-xs font-bold uppercase rounded-full"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 items-start">
              {cols.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-2.5 sm:gap-3.5">
                  <AnimatePresence mode="popLayout">
                    {col.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/2 cursor-crosshair shadow-md"
                      >
                        {/* Aspect Wrapper dynamically matched to individual database details */}
                        <div className={`w-full ${img.aspectRatio} relative overflow-hidden`}>
                          <img
                            src={img.url}
                            alt={img.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          {/* Dark overlay with tag/title metadata */}
                          <div className="absolute inset-0 bg-gradient-to-t from-dark/90 via-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10" />

                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono font-semibold text-coral uppercase tracking-widest">{img.category}</span>
                            <h4 className="font-display text-lg font-bold text-white uppercase leading-none truncate">{img.title}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {img.tags.slice(0, 2).map((tag, tIdx) => (
                                <span key={tIdx} className="text-[9px] font-mono px-2 py-0.5 bg-white/10 rounded-full text-white/80">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Below Grid Content: centered coral pill See More */}
            {visibleCount < sortedImages.length && (
              <div className="w-full flex justify-center mt-12">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                  className="px-8 py-3.5 bg-coral hover:bg-white text-white hover:text-dark font-medium text-xs sm:text-sm uppercase tracking-wider rounded-full transition-all duration-300 shadow-md transform hover:scale-[1.03]"
                >
                  See More
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
