"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";

const LIST_ITEMS = [
  "Free Edit",
  "Interactive",
  "Easy Interface",
  "Compare to other tools",
] as const;

function StepBadge({ step }: { step: string }) {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/70 text-[11px] font-medium tracking-wide text-white"
      aria-hidden
    >
      {step}
    </span>
  );
}

export default function ExploreCardsSection() {
  return (
    <section
    className="grid grid-cols-1 gap-1 lg:grid-cols-12"
      // className="w-full bg-background"
      id="explore-cards-section"
      aria-labelledby="explore-cards-heading"
    >
        {/* Card 01 — narrow */}
        <article className="relative min-h-[420px] overflow-hidden lg:col-span-3 lg:min-h-[560px]">
          <img
            src="/images/1.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-between p-8 lg:min-h-[560px] lg:p-10">
            <StepBadge step="01" />

            <div className="space-y-5">
              <p className="max-w-[240px] text-sm font-medium leading-relaxed text-white sm:text-[15px]">
                Discover how to shape emotion through music with hands-on audio
                creation techniques.
              </p>
              <a
                href="#search-section"
                className="group inline-flex items-center gap-3 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                Start Exploring
                <span className="flex items-center gap-1">
                  <span className="block h-px w-8 bg-white/90 transition-all group-hover:w-10" />
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </span>
              </a>
            </div>
          </div>
        </article>

        {/* Card 02 — narrow */}
        <article className="relative min-h-[420px] overflow-hidden lg:col-span-3 lg:min-h-[560px]">
          <img
            src="/images/2.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 flex h-full min-h-[420px] flex-col p-8 lg:min-h-[560px] lg:p-10">
            <StepBadge step="02" />

            <ul className="flex flex-1 flex-col justify-center">
              {LIST_ITEMS.map((item, index) => (
                <li key={item}>
                  <a
                    href="#"
                    className="group flex items-center justify-between gap-4 py-4 text-sm font-medium text-white transition-opacity hover:opacity-80"
                  >
                    <span>{item}</span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 opacity-90 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </a>
                  {index < LIST_ITEMS.length - 1 && (
                    <div className="h-px w-full bg-white/20" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Card 03 — wide */}
        <article className="relative min-h-[420px] overflow-hidden lg:col-span-6 lg:min-h-[560px]">
          <img
            src="/images/3.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex h-full min-h-[420px] flex-col justify-between p-8 lg:min-h-[560px] lg:p-10">
            <StepBadge step="03" />

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
              <p className="font-display text-6xl font-black leading-none tracking-tight text-white sm:text-7xl lg:text-[5.5rem]">
                +20K
              </p>
              <p className="max-w-[200px] text-sm font-medium leading-snug text-white/95 sm:pb-1 sm:text-[15px]">
                Tracks &amp; loops generated this week using AI-powered tools.
              </p>
            </div>
          </div>
        </article>
      
    </section>
  );
}
