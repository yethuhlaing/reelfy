import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FeaturedStackReversedSection() {
  return (
    <section
      id="featured-stack-reversed-section"
      className="relative w-full"
      aria-label="Featured showcase — alternate layout"
    >
      <div className="relative flex h-[100dvh] min-h-[680px] w-full items-center overflow-hidden">
        <div className="stack-bg-pink absolute inset-0" aria-hidden />

        <div className="absolute left-6 top-12 z-20 hidden max-w-[280px] md:block lg:left-12 lg:top-16 lg:max-w-[320px]">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FFB8C8]">
            AI Image Studio —
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Step into a creative pipeline that learns your intent, adapts in
            real time, and delivers human-centric visuals at scale.
          </p>
        </div>

        <div className="relative z-[2] mx-auto flex h-full w-full max-w-[1400px] flex-col justify-start px-6 pb-16 pt-20 md:px-12 md:pb-20 md:pt-24">
          <div className="relative mt-8 w-full md:mt-12 lg:mt-16">
            <div className="stack-panel-pink relative mx-auto w-full max-w-[1180px] overflow-hidden rounded-[2rem] px-6 py-10 md:rounded-[2.75rem] md:px-12 md:py-14 lg:min-h-[320px]">
              <div className="relative z-[2] grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="hidden lg:col-span-7 lg:block" aria-hidden />
                <div className="lg:col-span-5 lg:text-right">
                  <p className="ml-auto max-w-md text-base leading-relaxed text-white/95 md:text-lg">
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
              </div>
            </div>
          </div>
        </div>

        <p
          className="stack-word-pink pointer-events-none absolute inset-x-0 bottom-[6%] z-[1] select-none px-4 text-right font-display text-[clamp(5rem,20vw,12rem)] font-black uppercase leading-[0.85] tracking-[-0.04em] md:bottom-[8%] md:px-8 lg:px-12"
          aria-hidden
        >
          Featured
        </p>

        <div className="pointer-events-none absolute bottom-0 right-0 z-[25] h-[74%] w-[min(92vw,520px)] md:h-[80%] md:w-[min(58vw,640px)] lg:w-[min(52vw,720px)]">
          <div className="relative h-full w-full">
            <Image
              src="/transparent/5.png"
              alt="AI-generated portrait"
              fill
              className="object-contain object-right-bottom"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </div>
        </div>

        <div className="stack-float-badge-pink absolute left-[12%] top-[28%] z-[30] hidden items-center gap-3 rounded-full px-3 py-2 md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b0b0f] text-white">
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="pr-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
            Generative
          </span>
        </div>

        <div className="absolute bottom-[14%] left-6 z-[35] flex flex-col items-start md:left-12 lg:bottom-[16%]">
          <div className="stack-stat-pink-dark relative min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:min-w-[220px]">
            <p className="font-display text-4xl font-black leading-none text-white md:text-5xl">
              12K+
            </p>
            <p className="mt-1 text-xs font-medium text-white/70">
              Generated Assets
            </p>
          </div>

          <div className="stack-stat-pink-light -mt-3 ml-4 min-w-[200px] rounded-2xl px-6 py-5 shadow-2xl md:-mt-4 md:ml-6 md:min-w-[220px]">
            <p className="font-display text-4xl font-black leading-none text-[#0b0b0f] md:text-5xl">
              93%
            </p>
            <p className="mt-1 text-xs font-medium text-[#0b0b0f]/65">
              Visual Realism Score
            </p>
          </div>
        </div>

        <div className="absolute bottom-[calc(14%+200px)] left-6 right-6 z-20 md:hidden">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFB8C8]">
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
