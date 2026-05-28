"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";

function ParallaxLayer({
  y,
  className,
  children,
  style,
}: {
  y: MotionValue<number>;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div className={className} style={{ y, ...style }}>
      {children}
    </motion.div>
  );
}

export default function FeaturedStackSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const staticY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const featuredY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const floatBadgeY = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const statTopY = useTransform(scrollYProgress, [0, 1], [0, -130]);
  const statBottomY = useTransform(scrollYProgress, [0, 1], [0, -210]);
  const stepsY = useTransform(scrollYProgress, [0, 1], [0, -55]);

  const y = (value: MotionValue<number>) =>
    prefersReducedMotion ? staticY : value;

  return (
    <section
      ref={sectionRef}
      id="featured-stack-section"
      className="relative h-[200vh] w-full"
      aria-label="Featured showcase"
    >
      <div className="sticky top-0 flex h-[100dvh] min-h-[680px] w-full items-center overflow-hidden">
        <div className="hero-stack-bg absolute inset-0" aria-hidden />

        <ParallaxLayer
          y={y(stepsY)}
          className="absolute left-6 top-12 z-10 flex items-end gap-6 md:left-12 md:top-16 md:gap-10"
        >
          <span className="font-display text-[clamp(3rem,8vw,5.5rem)] font-black leading-none text-white">
            01
          </span>
          <span className="font-display text-[clamp(3rem,8vw,5.5rem)] font-black leading-none text-white/15">
            02
          </span>
          <span className="font-display text-[clamp(3rem,8vw,5.5rem)] font-black leading-none text-white/15">
            03
          </span>
        </ParallaxLayer>

        <ParallaxLayer
          y={y(featuredY)}
          className="pointer-events-none absolute inset-x-0 top-[38%] z-[1] -translate-y-1/2 select-none px-4"
        >
          <p
            className="hero-featured-word text-center font-display text-[clamp(4.5rem,18vw,11rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]"
            aria-hidden
          >
            Featured
          </p>
        </ParallaxLayer>

        <ParallaxLayer
          y={y(copyY)}
          className="absolute right-6 top-12 z-20 hidden max-w-[280px] md:block lg:right-12 lg:top-16 lg:max-w-[320px]"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-coral">
            AI Image Studio —
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Step into a creative pipeline that learns your intent, adapts in
            real time, and delivers human-centric visuals at scale.
          </p>
        </ParallaxLayer>

        <div className="relative z-[2] mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-6 pb-16 pt-20 md:px-12 md:pb-20 md:pt-24">
          <ParallaxLayer y={y(cardY)} className="relative mt-auto w-full">
            <div className="hero-orange-panel relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[2rem] px-6 py-10 md:rounded-[2.75rem] md:px-12 md:py-14 lg:min-h-[320px]">
              <div className="relative z-[2] grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                  <p className="max-w-md text-base leading-relaxed text-white/95 md:text-lg">
                    Get ready to dive into worlds beyond imagination with our
                    immersive AI image experiences.
                  </p>
                  <Link
                    href="/new"
                    className="group mt-8 inline-flex items-center gap-3 rounded-full bg-white py-3 pl-6 pr-3 text-sm font-semibold text-[#0b0b0f] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Discover More
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b0b0f] text-white transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
                <div className="hidden lg:col-span-7 lg:block" aria-hidden />
              </div>
            </div>
          </ParallaxLayer>
        </div>

        <ParallaxLayer
          y={y(imageY)}
          className="pointer-events-none absolute bottom-0 left-1/2 z-[25] h-[74%] w-[min(92vw,520px)] -translate-x-[42%] md:h-[80%] md:w-[min(58vw,640px)] md:-translate-x-[38%] lg:w-[min(52vw,720px)]"
        >
          <div className="relative h-full w-full">
            <Image
              src="/images/hero.png"
              alt="AI-generated portrait"
              fill
              className="object-contain object-bottom"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </div>
        </ParallaxLayer>

        <ParallaxLayer
          y={y(floatBadgeY)}
          className="absolute right-[12%] top-[32%] z-[30] hidden md:block"
        >
          <motion.div
            className="hero-float-badge flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-xl"
            animate={
              prefersReducedMotion
                ? undefined
                : { y: [0, -10, 4, -8, 0], rotate: [0, 1.5, -1, 0] }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b0b0f] text-white">
              <Sparkles className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="pr-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
              Generative
            </span>
          </motion.div>
        </ParallaxLayer>

        <div className="absolute bottom-[14%] right-6 z-[35] flex flex-col items-end md:right-12 lg:bottom-[16%]">
          <ParallaxLayer y={y(statTopY)} className="relative">
            <motion.div
              className="hero-stat-card-navy min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:min-w-[220px]"
              animate={prefersReducedMotion ? undefined : { y: [0, -6, 0] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <p className="font-display text-4xl font-black leading-none text-white md:text-5xl">
                12K+
              </p>
              <p className="mt-1 text-xs font-medium text-white/70">
                Generated Assets
              </p>
            </motion.div>
          </ParallaxLayer>

          <ParallaxLayer y={y(statBottomY)} className="-mt-3 mr-4 md:-mt-4 md:mr-6">
            <motion.div
              className="hero-stat-card-light min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:min-w-[220px]"
              animate={prefersReducedMotion ? undefined : { y: [0, 8, 0] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 6.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.4,
                    }
              }
            >
              <p className="font-display text-4xl font-black leading-none text-[#0b0b0f] md:text-5xl">
                93%
              </p>
              <p className="mt-1 text-xs font-medium text-[#0b0b0f]/65">
                Visual Realism Score
              </p>
            </motion.div>
          </ParallaxLayer>
        </div>

        <div className="absolute bottom-[calc(14%+200px)] left-6 right-6 z-20 md:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">
            AI Image Studio —
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Immersive AI image experiences built for creative teams.
          </p>
        </div>
      </div>
    </section>
  );
}
