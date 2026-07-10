"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Clock, Play, X } from "lucide-react";

import { useLazyVideoSource } from "@/shared/hooks/use-lazy-video-source";
import { marketingVideoUrl } from "@/shared/lib/utils";

const SAMPLE_VIDEO = marketingVideoUrl("8.mp4");
const SAMPLE_LABEL = "55s stickman explainer · sample output";

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Describe",
    body: "Paste a script, outline, or vibe — pick stickman, lofi, or another format.",
  },
  {
    step: "02",
    title: "Generate",
    body: "Reelfy plans scenes, voiceover, and motion — no timeline to wrestle with.",
  },
  {
    step: "03",
    title: "Download",
    body: "Preview, then export a publish-ready MP4 when you're happy.",
  },
] as const;

export default function VideoSection() {
  const headingId = useId();
  const [isPlaying, setIsPlaying] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);
  const { containerRef, shouldLoad } = useLazyVideoSource<HTMLElement>({ rootMargin: "600px" });

  const closeModal = useCallback(() => {
    setIsPlaying(false);
    const modalVideo = modalVideoRef.current;
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !shouldLoad) return;
    preview.muted = true;
    void preview.play().catch(() => {});
  }, [shouldLoad]);

  useEffect(() => {
    if (!isPlaying) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    const modalVideo = modalVideoRef.current;
    if (modalVideo) {
      void modalVideo.play().catch(() => {});
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isPlaying, closeModal]);

  return (
    <section
      ref={containerRef}
      className="flex h-screen w-full flex-col bg-background"
      id="video-section"
      aria-labelledby={headingId}
    >
      <div className="shrink-0 px-6 py-10 md:px-12 md:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">
              How it works
            </p>
            <h2
              id={headingId}
              className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-foreground md:text-4xl"
            >
              Idea in. Video out.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Three steps from your story to a downloadable video — watch a real
            Reelfy export, then start your own.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-4 pb-6 md:px-12 md:pb-10">
        <div className="group relative mx-auto h-full max-w-7xl overflow-hidden rounded-3xl border border-border shadow-2xl">
          <video
            ref={previewRef}
            src={shouldLoad ? SAMPLE_VIDEO : undefined}
            muted
            loop
            playsInline
            preload={shouldLoad ? "auto" : "none"}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            aria-hidden
          />

          <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/92 to-background/25 md:w-[72%] lg:w-[58%]" />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/90 via-transparent to-transparent" />

          <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
            <ol className="grid max-w-xl gap-3 sm:grid-cols-3 sm:gap-4">
              {PIPELINE_STEPS.map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-border/80 bg-background/70 p-4 backdrop-blur-md"
                >
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-coral">
                    {item.step}
                  </span>
                  <p className="mt-1 font-display text-sm font-black uppercase tracking-tight text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/new"
                  className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-foreground backdrop-blur-md">
                  <Clock className="h-3.5 w-3.5 text-coral" aria-hidden />
                  ~28s avg generation
                </span>
              </div>
            </div>
          </div>

          <div className="absolute right-[8%] top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-3 sm:right-[12%] md:right-[14%]">
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-card text-foreground shadow-[0_10px_30px_var(--coral-glow)] transition-all duration-300 hover:scale-110 hover:bg-softpink active:scale-95 sm:h-20 sm:w-20"
              aria-label="Play sample Reelfy video"
            >
              <Play className="h-6 w-6 translate-x-0.5 fill-primary-foreground text-primary-foreground sm:h-8 sm:w-8" />
            </button>
            <span className="select-none rounded-full bg-background/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground backdrop-blur-md sm:text-[11px]">
              Watch sample
            </span>
            <p className="max-w-[140px] text-center text-[10px] leading-snug text-muted-foreground sm:text-xs">
              {SAMPLE_LABEL}
            </p>
          </div>
        </div>
      </div>

      {isPlaying && (
        <div
          className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/95 p-4 backdrop-blur-md fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-label="Sample Reelfy video"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 z-50 cursor-pointer rounded-full bg-secondary p-2.5 text-foreground transition-colors hover:bg-coral hover:text-white"
              aria-label="Close video"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="aspect-video w-full bg-black">
              <video
                ref={modalVideoRef}
                src={SAMPLE_VIDEO}
                controls
                playsInline
                preload="auto"
                className="h-full w-full object-contain"
              />
            </div>

            <p className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
              {SAMPLE_LABEL} — representative of a stickman explainer export.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
