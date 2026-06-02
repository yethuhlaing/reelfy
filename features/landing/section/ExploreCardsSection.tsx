"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { newCategoryHref } from "@/shared/lib/categories";

const LIST_ITEMS = [
  { label: "Stickman Explainers", href: newCategoryHref("stickman") },
  { label: "Lofi Music", href: newCategoryHref("lofi") },
  { label: "ASMR Videos", href: "#search-section" },
  { label: "Cartoon Animation", href: "#search-section" },
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
      className="flex h-screen w-full flex-col bg-background"
      id="explore-cards-section"
      aria-labelledby="explore-cards-heading"
    >
      <div className="shrink-0 px-6 py-10 md:px-12 md:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">
              Explore
            </p>
            <h2
              id="explore-cards-heading"
              className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl"
            >
              One studio, every format
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Reelify helps creators produce explainers, lofi, ASMR, and cartoons
            — no editing skills needed.
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-1 md:grid-cols-3">
        <article className="relative h-full min-h-0 overflow-hidden">
          <img
            src="/images/1.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
            <StepBadge step="01" />

            <div className="space-y-5">
              <p className="max-w-[240px] text-sm font-medium leading-relaxed text-white sm:text-[15px]">
                Turn ideas into scroll-stopping videos with AI — explainers, lofi,
                ASMR, and cartoons in minutes.
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

        <article className="relative h-full min-h-0 overflow-hidden">
          <img
            src="/images/2.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 flex h-full flex-col p-8 lg:p-10">
            <StepBadge step="02" />

            <ul className="flex flex-1 flex-col justify-center">
              {LIST_ITEMS.map((item, index) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-4 py-4 text-sm font-medium text-white transition-opacity hover:opacity-80"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 opacity-90 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  </Link>
                  {index < LIST_ITEMS.length - 1 && (
                    <div className="h-px w-full bg-white/20" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="relative h-full min-h-0 overflow-hidden">
          <img
            src="/images/3.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
            <StepBadge step="03" />

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:gap-6">
              <p className="font-display text-6xl font-black leading-none tracking-tight text-white sm:text-7xl lg:text-[5.5rem]">
                +10K
              </p>
              <p className="max-w-[200px] text-sm font-medium leading-snug text-white/95 sm:pb-1 sm:text-[15px]">
                Videos generated this month using Reelify&apos;s AI-powered
                studio.
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
