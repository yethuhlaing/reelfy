import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FeaturedStackSection() {
  return (
    <section
      id="featured-stack-section"
      className="relative w-full"
      aria-label="Featured showcase"
    >
      <div className="relative flex h-[100dvh] min-h-[680px] w-full items-center overflow-hidden">
        <div className="hero-stack-bg absolute inset-0" aria-hidden />
        <p
          className="hero-featured-word pointer-events-none absolute inset-x-0 top-[38%] z-[1] -translate-y-1/2 select-none px-4 text-center font-display text-[clamp(4.5rem,18vw,11rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]"
          aria-hidden
        >
          Featured
        </p>

        <div className="absolute right-6 top-12 z-20 hidden max-w-[280px] md:block lg:right-12 lg:top-16 lg:max-w-[320px]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-coral">
            AI Image Studio —
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Step into a creative pipeline that learns your intent, adapts in
            real time, and delivers human-centric visuals at scale.
          </p>
        </div>

        <div className="relative z-[2] mx-auto flex h-full w-full max-w-[1400px] flex-col justify-center px-6 pb-16 pt-20 md:px-12 md:pb-20 md:pt-24">
          <div className="relative mt-auto w-full">
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
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-1/2 z-[25] h-[74%] w-[min(92vw,520px)] -translate-x-[42%] md:h-[80%] md:w-[min(58vw,640px)] md:-translate-x-[38%] lg:w-[min(52vw,720px)]">
          <div className="relative h-full w-full">
            <Image
              src="/transparent/6.png"
              alt="AI-generated portrait"
              fill
              className="object-contain object-bottom"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </div>
        </div>

        <div className="hero-float-badge absolute right-[12%] top-[32%] z-[30] hidden items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-xl md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b0b0f] text-white">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="pr-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            Generative
          </span>
        </div>

        <div className="absolute bottom-[14%] right-6 z-[35] flex flex-col items-end md:right-12 lg:bottom-[16%]">
          <div className="hero-stat-card-navy relative min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:min-w-[220px]">
            <p className="font-display text-4xl font-black leading-none text-white md:text-5xl">
              12K+
            </p>
            <p className="mt-1 text-xs font-medium text-white/70">
              Generated Assets
            </p>
          </div>

          <div className="hero-stat-card-light -mt-3 mr-4 min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:-mt-4 md:mr-6 md:min-w-[220px]">
            <p className="font-display text-4xl font-black leading-none text-[#0b0b0f] md:text-5xl">
              93%
            </p>
            <p className="mt-1 text-xs font-medium text-[#0b0b0f]/65">
              Visual Realism Score
            </p>
          </div>
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
