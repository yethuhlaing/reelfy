"use client";

import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useEffect, useId, useRef } from "react";

const VIDEO_SRC = "/videos/video-mask.mp4";

// Viewbox center for transform-origin
const VB_CX = 600;
const VB_CY = 370;

export default function VideoTextMaskSection() {
  const sectionId = useId();
  const maskId = `vcut-${sectionId.replace(/:/g, "")}`;
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });

  // Text scale: 1 → 11 (letters expand to cover full viewport)
  const textScale = useTransform(smoothProgress, [0, 0.7], [1, 11]);

  // Caption reveal
  const captionOpacity = useTransform(
    smoothProgress,
    [0.65, 0.8, 0.92, 1],
    [0, 1, 1, 0],
  );
  const captionY = useTransform(smoothProgress, [0.65, 0.82], [24, 0]);

  // Scroll indicator fades out early
  const scrollHintOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);

  // Keep overlay fully opaque until reveal completes — avoids gray wash (#686879) from partial black
  const maskOverlayOpacity = useTransform(smoothProgress, [0.82, 0.84], [1, 0]);

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
    <section ref={sectionRef} className="relative h-[300vh]">
      {/* ── sticky viewport ── */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
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
                    y="44%"
                    textAnchor="middle"
                    fill="black"
                    fontSize="285"
                    fontWeight="900"
                    fontFamily="var(--font-urbanist), 'Urbanist', system-ui, sans-serif"
                    letterSpacing="-0.04em"
                  >
                    STORY
                  </text>
                  <text
                    x="50%"
                    y="76%"
                    textAnchor="middle"
                    fill="black"
                    fontSize="285"
                    fontWeight="900"
                    fontFamily="var(--font-urbanist), 'Urbanist', system-ui, sans-serif"
                    letterSpacing="-0.04em"
                  >
                    VIDEO
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

        {/* Caption — fades in after reveal */}
        <motion.div
          className="absolute bottom-16 inset-x-0 z-40 flex flex-col items-center gap-3 pointer-events-none"
          style={{ opacity: captionOpacity, y: captionY }}
        >
          <p className="text-white/50 text-xs uppercase tracking-[0.3em] font-mono">
            Powered by AI
          </p>
          <h2 className="text-white text-4xl md:text-6xl font-black tracking-tight text-center leading-tight">
            Your story,
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, #818cf8 0%, #f472b6 50%, #fb923c 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              beautifully told.
            </span>
          </h2>
          <p className="text-white/60 text-sm max-w-xs text-center leading-relaxed">
            Generate cinematic visuals from a single prompt. No crew. No
            timeline. Just vision.
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
