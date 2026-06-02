"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { motion } from "motion/react";
import { TimelineContent } from "@/shared/components/timeline-animation";

const homeLinks = [
  { label: "About Us", href: "#crafting-section" },
  { label: "Featured", href: "#explore-cards-section" },
  { label: "Gallery", href: "#search-section" },
];

const resourceLinks = [
  { label: "Terms & Conditions", href: "#terms" },
  { label: "Privacy Policy", href: "#privacy" },
];

const revealVariants = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.12,
      duration: 0.55,
      ease: "easeOut" as const,
    },
  }),
  hidden: {
    filter: "blur(8px)",
    y: 24,
    opacity: 0,
  },
};

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);

  return (
    <footer
      ref={footerRef}
      id="reelify-footer"
      className="relative -mt-28 flex w-full flex-col overflow-hidden bg-transparent pt-28 text-foreground md:-mt-36 md:pt-36"
    >
      {/* Top blend — transparent into page background (overlaps pricing) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,transparent_0%,color-mix(in_oklab,var(--background)_55%,transparent)_22%,var(--background)_38%,var(--background)_100%)]"
      />

      {/* Grid + ambient glow — matches pricing section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 overflow-hidden opacity-40 [mask-image:linear-gradient(to_bottom,transparent_0%,black_40%),radial-gradient(50%_50%,white,transparent)] [mask-composite:intersect]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_80px]" />
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 [mask-image:linear-gradient(to_bottom,transparent_0%,black_40%)]"
        animate={{ opacity: [0.25, 0.35, 0.25] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="h-[420px] w-[min(100vw,720px)] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--coral-glow) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 z-0 h-72 w-72 rounded-full opacity-25 [mask-image:linear-gradient(to_bottom,transparent_0%,black_45%)]"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 140, 66, 0.3) 0%, transparent 70%)",
        }}
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grain — fades in with the top blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay [mask-image:linear-gradient(to_bottom,transparent_0%,black_32%)]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:min(25%,120px)_100%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_30%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pt-16 pb-10 sm:px-6 md:pt-20 md:pb-14 lg:px-8">
        {/* Top — 4-column info grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          {/* Address + email */}
          <TimelineContent
            animationNum={0}
            timelineRef={footerRef}
            customVariants={revealVariants}
            className="flex flex-col gap-8 sm:col-span-2 lg:col-span-4"
          >
            <motion.div
              className="flex h-3 w-10 overflow-hidden rounded-full"
              aria-hidden
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ originX: 0 }}
            >
              <span className="h-full w-1/2 bg-foreground" />
              <span className="h-full w-1/2 bg-coral" />
            </motion.div>

            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
                Address
              </p>
              <address className="space-y-0.5 text-sm font-medium not-italic leading-relaxed text-foreground/90 md:text-base">
                <span className="block">Sector 7, Metaverse</span>
                <span className="block">Jakarta Megapolis</span>
                <span className="block">12050</span>
              </address>
            </div>

            <a
              href="mailto:info@reelify.com"
              className="font-display text-2xl font-black tracking-tight text-foreground underline decoration-foreground/25 decoration-1 underline-offset-[6px] transition-colors hover:text-coral hover:decoration-coral sm:text-3xl md:text-[2rem]"
            >
              Info@reelify.com
            </a>
          </TimelineContent>

          {/* Home links */}
          <TimelineContent
            as="nav"
            animationNum={1}
            timelineRef={footerRef}
            customVariants={revealVariants}
            className="lg:col-span-2"
            aria-label="Home"
          >
            <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground">
              Home
            </p>
            <ul className="space-y-3 text-sm font-medium md:text-base">
              {homeLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </TimelineContent>

          {/* Resource links */}
          <TimelineContent
            as="nav"
            animationNum={2}
            timelineRef={footerRef}
            customVariants={revealVariants}
            className="lg:col-span-2"
            aria-label="Resources"
          >
            <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground">
              Resource
            </p>
            <ul className="space-y-3 text-sm font-medium md:text-base">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </TimelineContent>

          {/* Image + CTA */}
          <TimelineContent
            animationNum={3}
            timelineRef={footerRef}
            customVariants={revealVariants}
            className="sm:col-span-2 lg:col-span-4 lg:w-full"
          >
            <div className="relative pb-6">
              <div className="relative min-h-[360px] w-full overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] sm:min-h-[420px]">
                <motion.img
                  src="/transparent/6.png"
                  alt="Reelify creative showcase"
                  width={991}
                  height={1199}
                  className="absolute inset-0 z-0 h-full w-full object-contain object-top"
                  loading="lazy"
                  decoding="async"
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <Link
                href="/new"
                className="group absolute -bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 rounded-full bg-foreground px-5 py-3.5 text-sm font-semibold text-background shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-all hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(255,90,60,0.25)] active:scale-[0.98] sm:left-6 sm:right-6"
              >
                <span>Get Product</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-coral-foreground transition-transform group-hover:rotate-[-8deg]">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </TimelineContent>
        </div>

        {/* Middle — contact + giant wordmark */}
        <TimelineContent
          animationNum={4}
          timelineRef={footerRef}
          customVariants={revealVariants}
          className="mt-20 md:mt-28"
        >
          <div className="mb-6 md:mb-8">
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
              Contact Us
            </p>
            <a
              href="mailto:hello@reelify.com"
              className="footer-link text-sm font-medium md:text-base"
            >
              Hello@reelify.com
            </a>
          </div>

          <div className="relative flex flex-wrap items-start gap-2">
            <motion.h2
              className="font-display text-[clamp(3.5rem,18vw,13rem)] font-black uppercase leading-[0.85] tracking-[-0.06em] text-foreground"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            >
              REELIFY
              <span className="text-coral">.</span>
            </motion.h2>
            <motion.span
              className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground/25 text-xs font-bold text-foreground md:mt-4 md:h-14 md:w-14 md:text-sm"
              aria-label="Registered trademark"
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5, type: "spring", stiffness: 260 }}
            >
              ®
            </motion.span>
          </div>
        </TimelineContent>
      </div>

      {/* Bottom status bar */}
      <TimelineContent
        animationNum={5}
        timelineRef={footerRef}
        customVariants={revealVariants}
        className="relative mt-auto bg-coral py-4 text-coral-foreground"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "footer-shimmer 6s linear infinite",
          }}
        />
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-4 text-[11px] font-medium tracking-wide sm:flex-row sm:gap-4 sm:px-6 sm:text-xs lg:px-8">
          <p className="text-center sm:text-left">
            ©{currentYear} Reelify. All Right Reserved.
          </p>
          <p className="text-center opacity-95">
            Sector 7, Metaverse Jakarta Megapolis 12050
          </p>
          <div className="flex items-center gap-8 sm:gap-12">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              Facebook
            </a>
          </div>
        </div>
      </TimelineContent>
    </footer>
  );
}
