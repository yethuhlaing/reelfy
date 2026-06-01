'use client'

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLenis } from "lenis/react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lenis = useLenis();

  const navLinks = ["Services", "About Us", "Portfolio", "Contact Us"];

  const linkClass =
    "text-sm font-bold text-black hover:text-black/70 transition-colors";

  return (
    <nav className="w-full absolute top-0 left-0 z-50 px-6 py-6 md:px-12" id="aileng-nav">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <h1 className="select-none cursor-pointer hover:opacity-80 transition-opacity">
          <img
            src="/logos/logo.png"
            alt="Reelicy"
            className="h-11 w-auto md:h-14"
          />
        </h1>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((tab) => (
            <button
              key={tab}
              type="button"
              className={linkClass}
              id={`nav-link-${tab.toLowerCase().replace(" ", "-")}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Desktop Get Started */}
        <div className="hidden md:block">
          <button
            type="button"
            className="bg-black text-white font-extrabold text-sm tracking-wide px-6 py-3 rounded-full"
          >
            Get Started
          </button>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-3">
          <button
            type="button"
            onClick={() => {
              lenis?.scrollTo("#search-section", { offset: -96 });
            }}
            className="bg-black text-white px-4 py-2 rounded-full text-xs font-bold uppercase"
          >
            Explore
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-black hover:text-black/70 transition-colors"
            id="mobile-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-[80px] left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-6 flex flex-col gap-4 z-50 md:hidden animate-in fade-in duration-300">
          <div className="flex flex-col gap-4">
            {navLinks.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full text-left text-base ${linkClass}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="bg-black text-white font-medium tracking-wide w-full py-3.5 rounded-full text-sm"
          >
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}
