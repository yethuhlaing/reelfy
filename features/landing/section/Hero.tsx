"use client";

import { motion } from "motion/react";

export default function Hero() {
  return (
    <header
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      id="hero-section"
      style={{ background: "var(--hero-sunset)" }}
    >
      {/* Portrait — center-right, large, behind content */}
      <div
        className="absolute right-[6%] top-[6%] w-[58%] h-[94%] z-0 pointer-events-none select-none"
        style={{
          backgroundImage: "url('/images/hero.png')",
          backgroundPosition: "center top",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          maskImage:
            "radial-gradient(ellipse 70% 80% at 50% 40%, black 55%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 80% at 50% 40%, black 55%, transparent 90%)",
        }}
      />

      {/* Main grid */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 pt-32 pb-12 flex-grow flex flex-col">
        <div className="grid grid-cols-12 gap-6 flex-grow">
          {/* LEFT COLUMN — Badge + Headline */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-start">
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex w-fit items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.18em] text-white/90"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-coral-light to-coral flex items-center justify-center text-[9px] text-coral-foreground">
                ✦
              </span>
              AI Image Studio
            </motion.div>

            {/* Headline — left-aligned, multi-line, gradient fade on some lines */}
            <h1 className="mt-10 font-display font-black uppercase tracking-tighter leading-[0.92] text-[8.5vw] lg:text-[112px]">
              <span className="block text-white">The Future</span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.15) 90%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Of Generated
              </span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,240,210,0.95) 40%, rgba(120,40,10,0.5) 95%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                AI Images
              </span>
            </h1>
          </div>

          {/* RIGHT COLUMN — Glass info cards */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 lg:items-end">
            {/* Card 1 — Pixel density / chart */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full lg:w-[300px] rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm font-semibold">
                  Pixel Density
                </span>
                <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 text-xs">
                  ↗
                </span>
              </div>
              <div className="mt-3">
                <div className="text-white/60 text-xs">Ultra-high resolution</div>
                <div className="text-white/80 text-xs mt-1">
                  Faster output with premium engine.
                </div>
              </div>
              <svg
                viewBox="0 0 200 50"
                className="w-full h-10 mt-3"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--coral-light)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--coral)" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,40 L30,35 L60,30 L90,28 L120,22 L150,18 L180,8 L200,5"
                  fill="none"
                  stroke="url(#chartGrad)"
                  strokeWidth="2"
                />
                <circle cx="180" cy="8" r="3" fill="var(--coral-light)" />
              </svg>
            </motion.div>

            {/* Card 2 — Visual realism gauge */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="w-full lg:w-[300px] rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm font-semibold">
                  Visual Realism
                </span>
                <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 text-xs">
                  ↗
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="var(--coral-light)"
                      strokeWidth="8"
                      strokeDasharray={`${0.93 * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                    93%
                  </div>
                </div>
                <div className="text-white/70 text-xs leading-relaxed">
                  Exceptional fidelity across generated portraits.
                </div>
              </div>
            </motion.div>

            {/* Card 3 — Engine response */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full lg:w-[300px] rounded-2xl border border-white/15 bg-black/25 backdrop-blur-xl p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm font-semibold">
                  Engine Response
                </span>
                <span className="text-primary text-xs">▍▍</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary text-xs">
                  Response Auto-Optimized
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/50 text-xs">Latency</span>
                <span className="text-white font-semibold text-sm">110ms</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-12 gap-6 items-end mt-auto pt-12">
          {/* Bottom-left: dot pattern + description */}
          <div className="col-span-12 lg:col-span-5 flex items-start gap-4">
            <div className="grid grid-cols-3 gap-1 flex-shrink-0">
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-sm"
                  style={{
                    backgroundColor:
                      i % 4 === 0 ? "var(--coral-light)" : "var(--coral-muted)",
                  }}
                />
              ))}
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              An AI image platform that learns from creative intent, adapts in
              real time, and delivers human-centric visuals at scale.
            </p>
          </div>

          {/* Bottom-center: realism gauge */}
          <div className="col-span-12 lg:col-span-2 flex justify-center">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                  strokeDasharray="2 3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--coral-light)"
                  strokeWidth="2"
                  strokeDasharray={`${0.69 * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-lg">69%</span>
                <span className="text-white/50 text-[10px] uppercase tracking-wider">
                  Realism
                </span>
              </div>
            </div>
          </div>

          {/* Bottom-right: scroll cue */}
          <div className="col-span-12 lg:col-span-5 flex lg:justify-end items-center gap-2 text-white/50 text-xs uppercase tracking-[0.25em] font-mono">
            <span>Scroll Down</span>
            <span className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
              ↓
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
