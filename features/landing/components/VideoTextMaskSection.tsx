"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";

const VIDEO_SRC = "/videos/2.mp4";

export default function VideoTextMaskSection() {
  const sectionId = useId();
  const maskId = `vcut-${sectionId.replace(/:/g, "")}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldPlay = prefersReducedMotion !== true;
    let cancelled = false;

    const play = () => {
      if (cancelled || !shouldPlay) return;
      video.muted = true;
      video.play().catch(() => {});
    };

    if (shouldPlay) {
      play();
    } else {
      video.pause();
      return;
    }

    const onReady = () => play();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && shouldPlay) {
          video.muted = true;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(video);

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      observer.disconnect();
    };
  }, [prefersReducedMotion]);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="h-full w-full"
          viewBox="0 0 1200 700"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              <text
                x="50%"
                y="44%"
                textAnchor="middle"
                fill="black"
                fontSize="280"
                fontWeight="900"
                fontFamily="var(--font-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif"
                letterSpacing="-0.04em"
              >
                STORY
              </text>
              <text
                x="50%"
                y="72%"
                textAnchor="middle"
                fill="black"
                fontSize="280"
                fontWeight="900"
                fontFamily="var(--font-jakarta), 'Plus Jakarta Sans', system-ui, sans-serif"
                letterSpacing="-0.04em"
              >
                VIDEO
              </text>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="black" mask={`url(#${maskId})`} />
        </svg>
      </div>
    </section>
  );
}
