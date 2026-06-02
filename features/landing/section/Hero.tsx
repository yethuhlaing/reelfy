"use client";

import { motion } from "motion/react";
import { HyperText } from "@/shared/components/hyper-text";
import { cn } from "@/shared/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

const slideRight = {
  hidden: { opacity: 0, x: 40 },
  show: { opacity: 1, x: 0 },
};

function RealismGauge({ size = "md" }: { size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-28 w-28" : "h-24 w-24";
  const labelSize = size === "lg" ? "text-xl" : "text-lg";

  return (
    <div className={cn("relative shrink-0", dim)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          strokeDasharray="2 3"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--coral-light)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 42}`}
          initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
          animate={{ strokeDashoffset: (1 - 0.97) * 2 * Math.PI * 42 }}
          transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold text-white", labelSize)}>97%</span>
        <span className="text-[10px] uppercase tracking-wider text-white/50">
          Realism
        </span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <header
      className="relative flex h-screen w-full flex-col overflow-hidden"
      id="hero-section"
      style={{ background: "var(--hero-sunset)" }}
    >
      {/* Portrait — full bleed on mobile, positioned right on desktop */}
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 h-full w-full select-none bg-[url('/images/hero.png')] bg-cover bg-center bg-no-repeat",
          "lg:inset-auto lg:right-[6%] lg:top-[6%] lg:h-[94%] lg:w-[58%] lg:bg-contain lg:bg-[center_top]",
          "lg:[mask-image:radial-gradient(ellipse_70%_80%_at_50%_40%,black_55%,transparent_90%)]",
          "lg:[-webkit-mask-image:radial-gradient(ellipse_70%_80%_at_50%_40%,black_55%,transparent_90%)]",
        )}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        aria-hidden
      />

      {/* Mobile — legibility over full-bleed image */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-transparent to-black/70 lg:hidden"
        aria-hidden
      />

      {/* Main grid */}
      <div className="relative z-10 w-full max-w-full mx-auto px-8 pt-10 pb-10 flex-grow flex flex-col justify-between gap-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Badge + Headline */}
          <div className="col-span-12 flex flex-col justify-start">
            {/* Pill badge */}
            {/* <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="inline-flex w-fit items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.18em] text-white/90"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-coral-light to-coral flex items-center justify-center text-[9px] text-coral-foreground">
                ✦
              </span>
              AI Video Studio
            </motion.div> */}

            {/* Headline — hyper-text scramble, Urbanist display */}
            <h1 className="mt-44 font-display text-[12vw] font-black uppercase leading-[0.88] tracking-tighter sm:mt-20 sm:text-[11vw] md:mt-24 md:text-[10vw] lg:mt-24 lg:text-[128px] xl:text-[140px]">
              <motion.div
                className="block"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.35, duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <HyperText
                  as="span"
                  animateOnHover={false}
                  delay={400}
                  duration={900}
                  letterClassName="font-display text-white"
                  className="block py-0 text-[length:inherit] font-black leading-[inherit] tracking-[inherit] text-white"
                >
                  Animate
                </HyperText>
              </motion.div>
              <motion.div
                className="block"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.5, duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <HyperText
                  as="span"
                  animateOnHover={false}
                  delay={650}
                  duration={1000}
                  letterClassName="font-display text-white"
                  className="block py-0 text-[length:inherit] font-black leading-[inherit] tracking-[inherit] text-white"
                >
                  Your Story
                </HyperText>
              </motion.div>
              <motion.div
                className="block"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.65, duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <HyperText
                  as="span"
                  animateOnHover={false}
                  delay={900}
                  duration={1000}
                  letterClassName="font-display text-white"
                  className="block py-0 text-[length:inherit] font-black leading-[inherit] tracking-[inherit] text-white"
                >
                  With AI
                </HyperText>
              </motion.div>
            </h1>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-12 gap-6 items-end">
          {/* Bottom-left: gauge (mobile) + description */}
          <motion.div
            className="col-span-12 flex flex-col gap-5 lg:col-span-5 lg:gap-0"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }}
          >
            <motion.div
              className="flex justify-start lg:hidden"
              variants={fadeIn}
              initial="hidden"
              animate="show"
              transition={{ delay: 1.0, duration: 0.7, ease: "easeOut" }}
            >
              <RealismGauge size="lg" />
            </motion.div>

            <div className="flex items-start gap-4">
              <div className="grid shrink-0 grid-cols-3 gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-sm"
                    style={{
                      backgroundColor:
                        i % 4 === 0 ? "var(--coral-light)" : "var(--coral-muted)",
                    }}
                  />
                ))}
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/70">
                Reelify is the AI video platform for creators — generate
                explainers, lofi tracks, ASMR, and cartoon videos in seconds. No
                editing skills needed.
              </p>
            </div>
          </motion.div>

          {/* Bottom-center: realism gauge (desktop) */}
          <motion.div
            className="col-span-2 hidden justify-center lg:flex"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 1.0, duration: 0.7, ease: "easeOut" }}
          >
            <RealismGauge />
          </motion.div>

          {/* Bottom-right: glass info cards (desktop only) */}
          <div className="hidden flex-col items-stretch gap-4 lg:col-span-5 lg:flex lg:items-end">
            <motion.div
              variants={slideRight}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.9, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full rounded-2xl border border-white/15 bg-black/25 p-5 shadow-2xl backdrop-blur-xl lg:w-[300px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">
                  Videos Created
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-white/70">
                  ↗
                </span>
              </div>
              <div className="mt-3">
                <div className="text-white/60 text-xs">10K+ videos this month</div>
                <div className="text-white/80 text-xs mt-1">
                  Stickman, lofi, ASMR & cartoon — all formats.
                </div>
              </div>
              <svg
                viewBox="0 0 200 50"
                className="mt-2 h-8 w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--coral-light)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--coral)" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,44 L25,40 L50,36 L75,32 L100,24 L130,18 L160,10 L200,4"
                  fill="none"
                  stroke="url(#chartGrad)"
                  strokeWidth="2"
                />
                <circle cx="160" cy="10" r="3" fill="var(--coral-light)" />
              </svg>
            </motion.div>

            <motion.div
              variants={slideRight}
              initial="hidden"
              animate="show"
              transition={{ delay: 1.0, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full rounded-2xl border border-white/15 bg-black/25 p-5 shadow-2xl backdrop-blur-xl lg:w-[300px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">
                  Creator Satisfaction
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-white/70">
                  ↗
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="8"
                    />
                    <motion.circle
                      cx="40"
                      cy="40"
                      r="32"
                      fill="none"
                      stroke="var(--coral-light)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                      animate={{ strokeDashoffset: (1 - 0.96) * 2 * Math.PI * 32 }}
                      transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">
                    96%
                  </div>
                </div>
                <div className="text-xs leading-relaxed text-white/70">
                  Top-rated for AI video quality.
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={slideRight}
              initial="hidden"
              animate="show"
              transition={{ delay: 1.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full rounded-2xl border border-white/15 bg-black/25 p-4 shadow-2xl backdrop-blur-xl lg:w-[300px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/90">
                  Generation Speed
                </span>
                <span className="text-xs text-primary">▍▍</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="text-xs text-primary">AI Engine Active</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/50">Avg. per video</span>
                <span className="text-sm font-semibold text-white">~28s</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
}
