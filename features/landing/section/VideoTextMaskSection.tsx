"use client";

import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const VIDEO_SRC = "/videos/video-mask.mp4";

// Viewbox center for transform-origin
const VB_CX = 600;
const VB_CY = 370;

export default function VideoTextMaskSection() {
  const sectionId = useId();
  const maskId = `vcut-${sectionId.replace(/:/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.35,
  });

  const maskFontSize = isMobile ? 88 : 285;
  const scriptY = isMobile ? "46%" : "44%";
  const screenY = isMobile ? "62%" : "76%";

  // Text scale: 1 → maxScale (letters expand to cover full viewport)
  const textScale = useTransform(smoothProgress, (progress) => {
    const t = Math.min(Math.max(progress / 0.48, 0), 1);
    const max = isMobile ? 4.5 : 11;
    return 1 + t * (max - 1);
  });

  // Caption — only after mask is gone; long dwell before fade-out
  const captionOpacity = useTransform(
    smoothProgress,
    [0, 0.62, 0.68, 0.94, 1],
    [0, 0, 1, 1, 0],
  );
  const captionY = useTransform(smoothProgress, [0.62, 0.72], [28, 0]);

  // Scroll indicator fades out early
  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);

  // Keep overlay fully opaque until reveal completes — avoids gray wash from partial black
  const maskOverlayOpacity = useTransform(smoothProgress, [0.48, 0.62], [1, 0]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const play = () => {
      if (cancelled) return;
      video.muted = true;
      video.defaultMuted = true;
      void video.play().catch(() => {});
    };

    play();
    video.addEventListener("loadeddata", play);
    video.addEventListener("canplay", play);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || cancelled) return;
        entry.isIntersecting ? play() : video.pause();
      },
      { threshold: 0.05 },
    );
    observer.observe(video);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", play);
      video.removeEventListener("canplay", play);
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[280vh]">
      {/* ── sticky viewport ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        {/* Video layer */}
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />

        {/* Grain texture */}
        <div
          className="absolute inset-0 z-10 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px",
          }}
        />

        {/* SVG mask overlay */}
        <motion.div
          className="absolute inset-0 z-30"
          style={{ opacity: maskOverlayOpacity }}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <defs>
              <mask id={maskId}>
                <rect width="100%" height="100%" fill="white" />
                {/* Scale text from center of viewbox */}
                <motion.g
                  style={{
                    scale: textScale,
                    transformOrigin: `${VB_CX}px ${VB_CY}px`,
                  }}
                >
                  <text
                    x="50%"
                    y={scriptY}
                    textAnchor="middle"
                    fill="black"
                    fontSize={maskFontSize}
                    fontWeight="900"
                    fontFamily="var(--font-urbanist), 'Urbanist', system-ui, sans-serif"
                    letterSpacing={isMobile ? "-0.06em" : "-0.04em"}
                  >
                    SCRIPT
                  </text>
                  <text
                    x="50%"
                    y={screenY}
                    textAnchor="middle"
                    fill="black"
                    fontSize={maskFontSize}
                    fontWeight="900"
                    fontFamily="var(--font-urbanist), 'Urbanist', system-ui, sans-serif"
                    letterSpacing="-0.04em"
                  >
                    SCREEN
                  </text>
                </motion.g>
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="#000000"
              mask={`url(#${maskId})`}
            />
          </svg>
        </motion.div>

        {/* Caption — fades in only after mask reveal, then holds through extra scroll */}
        <motion.div
          className="absolute inset-x-0 bottom-20 z-40 flex flex-col items-center gap-3 px-6 pointer-events-none md:bottom-24"
          style={{ opacity: captionOpacity, y: captionY }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">
            Reelify studio
          </p>
          <h2 className="text-center font-display text-2xl font-black leading-[1.05] tracking-tight sm:text-4xl md:text-6xl">
            <span className="block text-white">Idea to MP4,</span>
            <span className="mt-1 block bg-gradient-to-r from-coral-light via-softpink to-coral bg-clip-text text-transparent">
              no edit bay.
            </span>
          </h2>
          <p className="max-w-sm text-center text-sm leading-relaxed text-white/60">
            Stickman explainers, lofi streams, and more — AI plans scenes,
            voiceover, and motion, then hands you a publish-ready download.
          </p>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 right-8 z-40 flex items-center gap-2 text-white/30 text-xs uppercase tracking-[0.25em] font-mono"
          style={{ opacity: scrollHintOpacity }}
        >
          <span>Scroll</span>
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}
