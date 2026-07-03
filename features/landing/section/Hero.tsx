"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Clock, Scissors, Sparkles } from "lucide-react";
import { useLenis } from "lenis/react";
import { HyperText } from "@/shared/components/hyper-text";
import { newCategoryHref } from "@/shared/lib/categories";
import { cn } from "@/shared/lib/utils";

const OUTCOMES = [
  {
    label: "Ship a launch story",
    detail: "Founders & marketers",
    href: newCategoryHref("stickman"),
  },
  {
    label: "Fill a study stream",
    detail: "Lofi & ambient channels",
    href: newCategoryHref("lofi"),
  },
  {
    label: "Teach one concept",
    detail: "Educators & coaches",
    href: newCategoryHref("stickman"),
  },
] as const;

const OLD_WAY = ["Storyboard", "Record & edit", "Export & revise"] as const;
const REELIFY_WAY = ["Describe your idea", "AI builds the video", "Download MP4"] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const fadeUpSoft = {
  hidden: { opacity: 0, y: 24 },
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

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
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
  const lenis = useLenis();

  const scrollToHowItWorks = () => {
    lenis?.scrollTo("#video-section", { offset: -80, duration: 1.2 });
  };

  return (
    <header
      className="relative w-full overflow-hidden"
      id="hero-section"
      style={{ background: "var(--hero-sunset)" }}
    >
      {/* Portrait — edge-to-edge on mobile, positioned right on desktop */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 h-full min-h-[100dvh] w-full select-none bg-[url('/images/hero.webp')] bg-cover bg-center bg-no-repeat lg:hidden"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1.05 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        aria-hidden
      />
      <motion.div
        className={cn(
          "pointer-events-none absolute z-0 hidden h-full min-h-[100dvh] w-full select-none bg-[url('/images/hero.webp')] bg-cover bg-center bg-no-repeat lg:block",
          "lg:inset-auto lg:right-[6%] lg:top-[6%] lg:h-[94%] lg:min-h-0 lg:w-[58%] lg:bg-contain lg:bg-[center_top]",
          "lg:[mask-image:radial-gradient(ellipse_85%_80%_at_52%_22%,black_58%,transparent_92%)]",
          "lg:[-webkit-mask-image:radial-gradient(ellipse_85%_80%_at_52%_22%,black_58%,transparent_92%)]",
        )}
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 0.96 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        aria-hidden
      />

      {/* Top vignette — nav & headline legibility */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[30%] max-h-64 bg-gradient-to-b from-black/40 to-transparent"
        aria-hidden
      />

      {/* Bottom fade — blends hero into page background */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[70%] bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--background)_20%,transparent)] via-40% to-[var(--background)]"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_90%_50%_at_50%_100%,rgba(255,216,155,0.1),transparent_55%)]"
        aria-hidden
      />

      {/* Viewport hero */}
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-full flex-col justify-between gap-6 px-8 pb-10 pt-10">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex flex-col justify-start">
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

        <div className="grid grid-cols-12 items-end gap-6">
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

          <motion.div
            className="col-span-2 hidden justify-center lg:flex"
            variants={fadeIn}
            initial="hidden"
            animate="show"
            transition={{ delay: 1.0, duration: 0.7, ease: "easeOut" }}
          >
            <RealismGauge />
          </motion.div>

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

      {/* Value pitch — continues the same hero canvas */}
      <div
        className="relative z-10 mx-auto flex max-w-7xl flex-col gap-12 px-6 pb-20 pt-16 md:gap-14 md:px-12 md:pb-24 md:pt-20"
        aria-labelledby="hero-value-heading"
      >
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">
              Skip the edit bay
            </p>
            <h2
              id="hero-value-heading"
              className="mt-2 font-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-4xl lg:text-5xl"
            >
              Days in Premiere.
              <br />
              <span className="text-white/75">Minutes in Reelify.</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#1a0a05] shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start creating
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              See how it works
            </button>
          </div>
        </div>

        <motion.div
          className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-1"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div
            variants={fadeUpSoft}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-xl md:p-8"
          >
            <div className="mb-5 flex items-center gap-2 text-white/50">
              <Scissors className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                The old way
              </span>
            </div>
            <ul className="space-y-4">
              {OLD_WAY.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-xs text-white/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium text-white/55 line-through decoration-white/25">
                    {step}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/30">
                    Hours–days
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

<motion.div
            variants={fadeUpSoft}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl border border-coral/30 bg-black/30 p-6 shadow-[0_0_60px_var(--coral-glow)] backdrop-blur-xl md:p-8"
          >
            <div className="mb-5 flex items-center gap-2 text-coral-light">
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                With Reelify
              </span>
            </div>
            <ul className="space-y-4">
              {REELIFY_WAY.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-xs text-coral-light">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-white">{step}</span>
                  {index === 1 && (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-coral/40 bg-coral/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-coral-light">
                      <Clock className="h-3 w-3" aria-hidden />
                      ~28s
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid gap-3 sm:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {OUTCOMES.map((outcome) => (
            <motion.div
              key={outcome.label}
              variants={fadeUpSoft}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Link
                href={outcome.href}
                className="group flex h-full flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/10"
              >
                <p className="font-display text-lg font-black uppercase leading-tight tracking-tight text-white">
                  {outcome.label}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/55">{outcome.detail}</span>
                  <ArrowRight className="h-4 w-4 text-white/50 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
