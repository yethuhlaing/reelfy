'use client'

import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

export default function Navbar() {
  const [activeTab, setActiveTab] = useState("Services");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = ["Services", "About Us", "Portfolio", "Contact Us"];

  return (
    <nav className="w-full absolute top-0 left-0 z-50 px-6 py-6 md:px-12" id="aileng-nav">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Wordmark */}
        <h1 className="font-display text-4xl font-black tracking-tight text-dark uppercase select-none cursor-pointer hover:opacity-80 transition-opacity">
          AILENG
        </h1>

        {/* Desktop Navbar Center Pill */}
        <div className="hidden md:flex items-center bg-white/70 backdrop-blur-md border border-[#E9E1D2] p-1.5 rounded-full shadow-sm hover:shadow-md transition-shadow">
          {navLinks.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 ${
                  isActive
                    ? "bg-dark text-white shadow-sm"
                    : "text-dark/60 hover:text-dark hover:bg-dark/5"
                }`}
                id={`nav-link-${tab.toLowerCase().replace(" ", "-")}`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Desktop Get Started Button */}
        <div className="hidden md:block">
          <button className="bg-dark hover:bg-coral text-white font-medium text-sm tracking-wide px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-sm hover:shadow-coral/20 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-softpink" />
            Get Started
          </button>
        </div>

        {/* Mobile Menu Actions */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => {
              const el = document.getElementById("search-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-dark text-white px-4 py-2 rounded-full text-xs font-semibold uppercase"
          >
            Explore
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-dark hover:bg-dark/5 rounded-full transition-colors"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-[80px] left-6 right-6 bg-white border border-[#E9E1D2] rounded-2xl p-6 shadow-xl flex flex-col gap-4 z-50 md:hidden animate-in fade-in duration-300">
          <div className="flex flex-col gap-2">
            {navLinks.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium ${
                    isActive
                      ? "bg-dark text-white"
                      : "text-dark/70 hover:bg-dark/5"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <hr className="border-dark/10" />
          <button className="bg-coral text-white font-bold tracking-wide w-full py-3.5 rounded-full flex items-center justify-center gap-2 text-sm shadow-md">
            <Sparkles className="w-4 h-4" />
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}
