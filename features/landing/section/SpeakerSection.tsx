"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Headphones, Music2, Radio, Sparkles, AudioLines } from "lucide-react";

import { Speaker } from "@/features/landing/section/Speaker";

const STATS = [
  { value: "48kHz", label: "Sample Rate" },
  { value: "320", label: "kbps Quality" },
  { value: "∞", label: "Tracks" },
];

const PILLS = [
  { label: "AI-Generated Soundscapes", icon: Sparkles, offset: "sm:translate-x-0" },
  { label: "Real-Time Waveform Scrub", icon: AudioLines, offset: "sm:translate-x-6" },
  { label: "Ambience Engine Built-In", icon: Radio, offset: "sm:translate-x-12" },
];

export default function SpeakerSection() {
  return (
    <section
      id="speaker-section"
      className="relative w-full overflow-hidden bg-background py-20 md:py-28"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(213,247,12,0.05) 0%, rgba(255,90,60,0.04) 45%, transparent 75%)",
        }}
      />

      {/* Decorative corner accent */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-px w-[40vw] opacity-30"
        style={{ background: "linear-gradient(90deg, transparent, var(--coral-light))" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-px w-[40vw] opacity-20"
        style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
        aria-hidden
      />

      <div className="relative z-[2] mx-auto max-w-[1400px] px-6 md:px-12">
        {/*
          Desktop: [ portrait | copy | player ] — each in its own column, no overlap.
          Mobile: copy → portrait → player
        */}
        <div className="grid grid-cols-1 items-end gap-12 lg:grid-cols-[minmax(0,26%)_minmax(0,1fr)_minmax(300px,32%)] lg:gap-8 xl:gap-12">

          {/* ── Column 1: Portrait ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative order-2 mx-auto h-[min(52vh,420px)] w-full max-w-[300px] lg:order-1 lg:mx-0 lg:h-[min(68vh,580px)] lg:max-w-none lg:justify-self-start"
          >
            <Image
              src="/transparent/2.png"
              alt=""
              fill
              className="object-contain object-bottom object-left"
              sizes="(max-width: 1024px) 300px, 26vw"
              priority={false}
            />
          </motion.div>

          {/* ── Column 2: Copy ── */}
          <div className="order-1 flex min-w-0 flex-col lg:order-2 lg:px-2 xl:px-4">

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-coral backdrop-blur-sm"
            >
              <Headphones className="h-3.5 w-3.5" />
              AI Music Player
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.88] tracking-tight text-foreground xl:text-[clamp(3.5rem,5vw,6rem)]"
            >
              <span className="block">SOUND</span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(90deg, var(--coral-light) 0%, var(--accent) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                MEETS
              </span>
              <span className="block">AI</span>
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-10 flex flex-wrap gap-6 sm:gap-8"
            >
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="font-display text-2xl font-black leading-none text-foreground">
                    {s.value}
                  </span>
                  <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="mt-10 flex flex-col gap-3"
            >
              {PILLS.map((pill, i) => {
                const Icon = pill.icon;
                const bgMap = ["bg-coral", "bg-mint", "bg-[var(--accent)]"] as const;
                const textMap = [
                  "text-coral-foreground",
                  "text-foreground",
                  "text-accent-foreground",
                ] as const;
                const iconMap = [
                  "text-white/70",
                  "text-coral",
                  "text-accent-ink/70",
                ] as const;
                return (
                  <motion.div
                    key={pill.label}
                    whileHover={{ x: 12, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex w-fit cursor-pointer items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-wider shadow-sm ${bgMap[i]} ${textMap[i]} ${pill.offset}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${iconMap[i]}`} />
                    ✦ {pill.label}
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-10 max-w-md border-t border-border pt-6"
            >
              <p className="text-sm font-light leading-relaxed text-muted-foreground">
                Scrub through AI-generated tracks in real-time, toggle ambience
                mode for immersive reverb, and watch dual orbs pulse in sync with
                every frequency.
              </p>
            </motion.div>
          </div>

          {/* ── Column 3: Speaker / playlist ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="relative order-3 flex w-full justify-center lg:justify-end"
          >
            <div
              className="pointer-events-none absolute inset-[10%] rounded-3xl blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(213,247,12,0.08) 0%, rgba(255,90,60,0.06) 60%, transparent 85%)",
              }}
              aria-hidden
            />

            <div className="relative w-full max-w-[420px] lg:max-w-[440px]">
              <Speaker />

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="absolute -bottom-6 right-0 hidden items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 shadow-2xl backdrop-blur-xl lg:flex"
              >
                <Music2 className="h-4 w-4 text-coral-light" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                  ElevenMusic
                </span>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
