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

  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const colors = ["All", "warm", "cool", "neutral", "colorful"];
  const categories = ["All", "Portrait", "Nature", "Abstract", "Architecture", "Car", "Animal"];
  const aspectRatios = ["All", "Square (1:1)", "Portrait (3:4 or 2:3)", "Landscape (4:3)"];
  const sortOptions = ["Features", "A-Z Title", "Random Mixed"];

  const filteredImages = PORTFOLIO_IMAGES.filter((img) => {
    const matchSearch =
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchColor = selectedColor === "All" || img.color === selectedColor;
    const matchCategory = selectedCategory === "All" || img.category === selectedCategory;

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

  const sortedImages = [...filteredImages].sort((a, b) => {
    if (sortBy === "A-Z Title") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "Random Mixed") {
      return Number(a.id) % 2 === Number(b.id) % 2 ? 1 : -1;
    }
    return 0;
  });

  const pagedImages = sortedImages.slice(0, visibleCount);

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

  const filterBtnActive = "bg-coral border-coral text-coral-foreground";
  const filterBtnIdle = "bg-secondary border-border text-foreground hover:bg-secondary/80";
  const dropdownItemActive = "bg-coral text-coral-foreground";
  const dropdownItemIdle = "text-muted-foreground hover:bg-secondary";

  return (
    <section className="w-full bg-background text-foreground px-6 md:px-12 py-16 md:py-24" id="search-section">
      <div className="max-w-7xl mx-auto flex flex-col gap-12">
        
        <div className="text-center flex flex-col items-center gap-6">
          
          <span className="text-xs font-mono tracking-[0.2em] font-semibold text-coral uppercase select-none leading-none flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-softpink" />
            Vast Creative Assets
          </span>

          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl font-black leading-[0.9] tracking-widest text-center uppercase">
            <span>FIND STUNNING</span>
            <br />
            <span>ASSETS INSTANTLY</span>
          </h2>

          <div className="w-full max-w-xl relative mt-4">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images, styles, topics..."
              className="w-full bg-secondary border border-border hover:border-foreground/20 focus:border-primary duration-300 py-4.5 pl-14 pr-6 rounded-full text-sm font-medium tracking-wide outline-none text-foreground focus:ring-1 focus:ring-primary shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold bg-secondary text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full uppercase"
              >
                Clear
              </button>
            )}
          </div>

          <div className="w-full flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mt-4 border-t border-b border-border py-5">
            
            <div className="flex flex-wrap items-center gap-3">
              
              <div className="relative">
                <button
                  onClick={() => {
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setColorDropdownOpen(false);
                    setAspectDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedCategory !== "All" ? filterBtnActive : filterBtnIdle
                  }`}
                >
                  Category: {selectedCategory}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-44 bg-card border border-border rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedCategory === cat ? dropdownItemActive : dropdownItemIdle
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setColorDropdownOpen(!colorDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setAspectDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedColor !== "All" ? filterBtnActive : filterBtnIdle
                  }`}
                >
                  Color: {selectedColor}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${colorDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {colorDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-40 bg-card border border-border rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedColor(c);
                          setColorDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                          selectedColor === c ? dropdownItemActive : dropdownItemIdle
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setAspectDropdownOpen(!aspectDropdownOpen);
                    setCategoryDropdownOpen(false);
                    setColorDropdownOpen(false);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-full tracking-wide transition-all uppercase select-none cursor-pointer ${
                    selectedAspect !== "All" ? filterBtnActive : filterBtnIdle
                  }`}
                >
                  Aspect: {selectedAspect.split(" ")[0]}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aspectDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {aspectDropdownOpen && (
                  <div className="absolute top-[105%] left-0 z-40 w-52 bg-card border border-border rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                    {aspectRatios.map((a) => (
                      <button
                        key={a}
                        onClick={() => {
                          setSelectedAspect(a);
                          setAspectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedAspect === a ? dropdownItemActive : dropdownItemIdle
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(selectedColor !== "All" || selectedCategory !== "All" || selectedAspect !== "All" || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-coral text-foreground hover:text-white text-[10px] font-bold uppercase rounded-full transition-colors font-mono"
                  title="Reset all filters"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Filters
                </button>
              )}

            </div>

            <div className="relative flex justify-end">
              <button
                onClick={() => {
                  setSortDropdownOpen(!sortDropdownOpen);
                  setCategoryDropdownOpen(false);
                  setColorDropdownOpen(false);
                  setAspectDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 text-xs font-semibold rounded-full tracking-wide text-foreground uppercase select-none cursor-pointer transition-colors"
                id="sort-by-features"
              >
                Sort by: {sortBy}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {sortDropdownOpen && (
                <div className="absolute top-[105%] right-0 z-40 w-44 bg-card border border-border rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in duration-150">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSortBy(opt);
                        setSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        sortBy === opt ? "bg-foreground text-background" : dropdownItemIdle
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

        {sortedImages.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Filter className="w-10 h-10 stroke-1" />
            <h3 className="font-display text-2xl font-black uppercase text-foreground tracking-widest leading-none">
              No matching assets
            </h3>
            <p className="text-sm font-light max-w-sm">
              We couldn't find any generated results for current criteria. Try resetting filters or changing terms.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-3 px-6 py-2.5 bg-coral text-coral-foreground text-xs font-bold uppercase rounded-full"
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
                        className="group relative overflow-hidden rounded-xl border border-border bg-secondary/50 cursor-crosshair shadow-md"
                      >
                        <div className={`w-full ${img.aspectRatio} relative overflow-hidden`}>
                          <img
                            src={img.url}
                            alt={img.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10" />

                          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20 flex flex-col gap-1.5">
                            <span className="text-[10px] font-mono font-semibold text-coral uppercase tracking-widest">{img.category}</span>
                            <h4 className="font-display text-lg font-bold text-foreground uppercase leading-none truncate">{img.title}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {img.tags.slice(0, 2).map((tag, tIdx) => (
                                <span key={tIdx} className="text-[9px] font-mono px-2 py-0.5 bg-secondary rounded-full text-foreground/80">
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

            {visibleCount < sortedImages.length && (
              <div className="w-full flex justify-center mt-12">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                  className="px-8 py-3.5 bg-coral hover:bg-card text-coral-foreground hover:text-foreground font-medium text-xs sm:text-sm uppercase tracking-wider rounded-full transition-all duration-300 shadow-md transform hover:scale-[1.03]"
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
