"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { VerticalCutReveal } from "../components/vertical-cut-reveal";
import { TimelineContent } from "@/shared/components/timeline-animation";
import { PLAN_DISPLAY } from "@/features/billing/plans-display";

const plans = PLAN_DISPLAY;

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-secondary/60 p-1 ring-1 ring-white/5">
        <button
          type="button"
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 h-10 w-fit rounded-full px-3 py-1 font-medium transition-colors sm:px-6 sm:py-2",
            selected === "0" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="pricing-period-switch"
              className="absolute inset-0 rounded-full bg-coral shadow-[0_0_24px_var(--coral-glow)]"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 h-10 w-fit flex-shrink-0 rounded-full px-3 py-1 font-medium transition-colors sm:px-6 sm:py-2",
            selected === "1" ? "text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="pricing-period-switch"
              className="absolute inset-0 rounded-full bg-coral shadow-[0_0_24px_var(--coral-glow)]"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Yearly
            <span className="rounded-full bg-coral/15 px-1.5 py-0.5 text-[10px] font-semibold text-coral">
              2 months free
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const headingId = useId();
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.15,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  return (
    <section
      ref={pricingRef}
      id="pricing-section"
      aria-labelledby={headingId}
      className="relative z-10 w-full min-h-screen overflow-visible bg-background px-4 py-12 pb-32 md:h-screen md:overflow-hidden md:px-12 md:py-16 md:pb-16"
    >
      {/* Soft fades so the section reads as one surface with neighbors */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
      />

      <TimelineContent
        animationNum={4}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden opacity-40 [mask-image:radial-gradient(50%_50%,white,transparent)]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:70px_80px]" />
      </TimelineContent>

      <TimelineContent
        animationNum={5}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
      >
        <div
          className="h-[420px] w-[min(100vw,720px)] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--coral-glow) 0%, transparent 70%)",
          }}
        />
      </TimelineContent>

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mx-auto mb-10 max-w-3xl space-y-4 text-center md:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">
            Pricing
          </p>
          <h2
            id={headingId}
            className="font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl"
          >
            <VerticalCutReveal
              splitBy="words"
              staggerDuration={0.15}
              staggerFrom="first"
              reverse
              containerClassName="justify-center"
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 40,
                delay: 0,
              }}
            >
              Plans that work best for you
            </VerticalCutReveal>
          </h2>

          <TimelineContent
            as="p"
            animationNum={0}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            Trusted by creators worldwide — explore which option fits your
            workflow.
          </TimelineContent>

          <TimelineContent
            as="div"
            animationNum={1}
            timelineRef={pricingRef}
            customVariants={revealVariants}
          >
            <PricingSwitch onSwitch={togglePricingPeriod} />
          </TimelineContent>
        </header>

        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <TimelineContent
              key={plan.name}
              as="div"
              animationNum={2 + index}
              timelineRef={pricingRef}
              customVariants={revealVariants}
            >
              <Card
                className={cn(
                  "relative h-full border-0 bg-card/80 text-card-foreground shadow-none ring-1 ring-white/[0.06]",
                  plan.highlight &&
                    "z-20 ring-coral/20 shadow-[0_-8px_80px_-12px_var(--coral-glow)]",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-coral px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <CardHeader className="text-left">
                  <h3 className="mb-2 font-display text-2xl font-black uppercase tracking-tight">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-semibold">
                      $
                      <NumberFlow
                        format={{ currency: "USD" }}
                        value={isYearly ? plan.yearlyUsd : plan.priceUsd}
                        className="text-4xl font-semibold"
                      />
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      {plan.priceUsd === 0 ? "forever" : `/${isYearly ? "year" : "month"}`}
                    </span>
                  </div>

                  {/* Credit allotment — the heart of the model, shown up front. */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral ring-1 ring-coral/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden />
                    {plan.monthlyCredits.toLocaleString()} credits
                    {plan.priceUsd === 0 ? " to start" : " / month"}
                  </div>

                  <p className="mb-4 mt-3 text-sm text-muted-foreground">
                    {plan.tagline}
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <Link
                    href="/pricing"
                    className={cn(
                      "mb-6 flex w-full items-center justify-center rounded-xl p-4 text-sm font-semibold transition-opacity hover:opacity-90",
                      plan.highlight
                        ? "bg-coral text-white shadow-[0_8px_24px_var(--coral-glow)]"
                        : "bg-secondary/80 text-foreground",
                    )}
                  >
                    {plan.priceUsd === 0 ? "Get started free" : "Get started"}
                  </Link>

                  <ul className="space-y-2 border-t border-white/[0.06] pt-4">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-coral/70"
                          aria-hidden
                        />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Credits fund every generator; nudge toward top-ups. */}
                  <p className="mt-4 text-xs text-muted-foreground/70">
                    Need more? Top up with credit packs anytime.
                  </p>
                </CardContent>
              </Card>
            </TimelineContent>
          ))}
        </div>
      </div>
    </section>
  );
}
